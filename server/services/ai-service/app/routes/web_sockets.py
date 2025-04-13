import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from typing import Optional, Dict, Any
import asyncio
import time
from datetime import datetime

from app.services.voice_assistant_service import voice_assistant_service
from app.utils.websocket_manager import websocket_manager
from app.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize router
router = APIRouter(
    prefix="/voice-assistant",
    tags=["voice-assistant"],
    responses={404: {"description": "Not found"}},
)


@router.websocket("/ws")
# This code should be added to the web_sockets.py file,
# specifically to update the main websocket_endpoint function
async def websocket_endpoint(
        websocket: WebSocket,
        sessionId: str = Query(..., description="Session identifier")
):
    """
    WebSocket endpoint for voice assistant communication with improved error handling

    Args:
        websocket (WebSocket): WebSocket connection
        sessionId (str): Session identifier from query params
    """
    # Log websocket connection attempt
    logger.info(f"WebSocket connection attempt for session {sessionId}")

    # Store heartbeat task for later cancellation
    heartbeat_task = None

    try:
        # Accept the connection with proper error handling
        try:
            await websocket_manager.connect(websocket, sessionId)
            logger.info(f"WebSocket connection accepted for session {sessionId}")
        except Exception as e:
            logger.error(f"Error accepting WebSocket connection for session {sessionId}: {str(e)}")
            # Try a raw accept if the manager failed
            try:
                await websocket.accept()
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Error establishing connection with session manager"
                    }
                })
                await websocket.close(1011)  # 1011 = Internal Error
            except Exception:
                pass  # Can't do much if this fails too
            return

        # Send initial connection confirmation message
        try:
            await websocket_manager.send_json(sessionId, {
                "type": "connection_status",
                "data": {
                    "status": "connected",
                    "message": "WebSocket connection established"
                }
            })
        except Exception as e:
            logger.error(f"Error sending initial confirmation for session {sessionId}: {str(e)}")
            # Non-fatal, continue

        # Register a heartbeat task to detect stale connections
        async def heartbeat():
            try:
                while websocket_manager.is_connected(sessionId):
                    try:
                        await websocket_manager.send_json(sessionId, {
                            "type": "heartbeat",
                            "data": {
                                "timestamp": datetime.now().isoformat()
                            }
                        })
                        # Shorter heartbeat during presentation mode
                        is_presenting = (
                                hasattr(voice_assistant_service, 'presentation_states') and
                                sessionId in voice_assistant_service.presentation_states and
                                getattr(voice_assistant_service.presentation_states[sessionId], 'presentation_active',
                                        False)
                        )
                        wait_time = 15 if is_presenting else 30  # More frequent during presentations
                        await asyncio.sleep(wait_time)
                    except asyncio.CancelledError:
                        # Heartbeat cancellation is normal during shutdown
                        logger.debug(f"Heartbeat task cancelled for session {sessionId}")
                        break
                    except Exception as e:
                        logger.error(f"Error in heartbeat for session {sessionId}: {str(e)}")
                        # Don't crash the heartbeat loop on errors
                        await asyncio.sleep(5)  # Short delay before retry
            except WebSocketDisconnect:
                logger.info(f"Heartbeat detected disconnection for session {sessionId}")
            except Exception as e:
                logger.error(f"Heartbeat error for session {sessionId}: {str(e)}")
            finally:
                logger.info(f"Heartbeat task ended for session {sessionId}")

        # Start heartbeat in background
        heartbeat_task = websocket_manager.create_task(sessionId, heartbeat())

        # Main message handling loop with better error boundaries
        while True:
            try:
                # Verify connection is still valid before receiving
                if not websocket_manager.is_connected(sessionId):
                    logger.info(f"Connection no longer active for {sessionId}, stopping loop")
                    break

                # Handle incoming messages (could be text or binary)
                try:
                    # Use receive with a short timeout to avoid blocking forever
                    message = await asyncio.wait_for(websocket.receive(), timeout=60.0)
                except asyncio.TimeoutError:
                    # This is not necessarily an error - just a long quiet period
                    logger.info(f"No messages received from {sessionId} for 60 seconds, checking connection")
                    # Send a ping to verify connection is still good
                    try:
                        await websocket_manager.send_json(sessionId, {
                            "type": "ping",
                            "data": {
                                "timestamp": datetime.now().isoformat()
                            }
                        })
                        # If send succeeded, connection is still good, continue loop
                        continue
                    except Exception:
                        # Connection is lost
                        logger.info(f"Connection appears dead after timeout for {sessionId}")
                        break

                # Handle text messages (JSON commands)
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        logger.info(f"Received text message from session {sessionId}: {data.get('type', 'unknown')}")

                        # Handle heartbeat response
                        if data.get('type') == 'heartbeat_response' or data.get('type') == 'pong':
                            continue

                        # Process the message in a background task to prevent blocking
                        websocket_manager.create_task(
                            sessionId,
                            handle_text_message(sessionId, data)
                        )

                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON received from session {sessionId}")
                        try:
                            if websocket_manager.is_connected(sessionId):
                                await websocket_manager.send_json(sessionId, {
                                    "type": "error",
                                    "data": {
                                        "message": "Invalid JSON format"
                                    }
                                })
                        except Exception as e:
                            logger.error(f"Error sending JSON error message: {str(e)}")

                # Handle binary messages (audio data)
                elif "bytes" in message:
                    try:
                        data_size = len(message["bytes"])
                        logger.info(f"Received binary message from session {sessionId}, size: {data_size} bytes")

                        # Process audio in a background task to prevent blocking
                        websocket_manager.create_task(
                            sessionId,
                            handle_binary_message(sessionId, message["bytes"])
                        )

                    except Exception as e:
                        logger.error(f"Error processing audio from session {sessionId}: {str(e)}")
                        try:
                            if websocket_manager.is_connected(sessionId):
                                await websocket_manager.send_json(sessionId, {
                                    "type": "error",
                                    "data": {
                                        "message": "Error processing audio data"
                                    }
                                })
                        except Exception:
                            # If we can't send this error, the connection is probably dead
                            break

            except WebSocketDisconnect as e:
                logger.info(f"WebSocket client disconnected: {sessionId} (code: {getattr(e, 'code', 'unknown')})")
                break
            except Exception as e:
                logger.error(f"Error processing WebSocket message for session {sessionId}: {str(e)}")
                # Check if it's an ASGI disconnect error
                error_str = str(e).lower()
                if any(phrase in error_str for phrase in ["disconnect message", "cannot call", "websocket.close"]):
                    logger.info(f"Client appears disconnected, stopping message loop for {sessionId}")
                    break

                # Try to send error back to client
                try:
                    if websocket_manager.is_connected(sessionId):
                        await websocket_manager.send_json(sessionId, {
                            "type": "error",
                            "data": {
                                "message": f"Server error: {str(e)}"
                            }
                        })
                except Exception:
                    # If we can't send the message, assume disconnected
                    break

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected during setup: {sessionId}")
    except Exception as e:
        logger.error(f"WebSocket setup error for session {sessionId}: {str(e)}")
        import traceback
        logger.error(f"Setup error details: {traceback.format_exc()}")
    finally:
        # Always clean up properly
        logger.info(f"Cleaning up WebSocket connection for session {sessionId}")

        # Cancel heartbeat task if running
        if heartbeat_task and not heartbeat_task.done():
            try:
                heartbeat_task.cancel()
                await asyncio.sleep(0.1)  # Give it a moment to cancel
            except Exception as e:
                logger.warning(f"Error cancelling heartbeat task: {str(e)}")

        # Ensure we properly disconnect using the manager
        try:
            await websocket_manager.disconnect(sessionId)
        except Exception as e:
            logger.error(f"Error during final WebSocket cleanup for {sessionId}: {str(e)}")

        logger.info(f"WebSocket connection cleanup completed for session {sessionId}")
async def handle_text_message(session_id: str, data: Dict[str, Any]):
    """
    Handle text/JSON messages from the client

    Args:
        session_id (str): Session identifier
        data (Dict[str, Any]): Message data
    """
    if not websocket_manager.is_connected(session_id):
        logger.warning(f"Attempt to handle message for disconnected session: {session_id}")
        return

    message_type = data.get("type", "")

    # Handle different message types
    if message_type == "init":
        # Handle initialization message
        logger.info(f"Initializing session {session_id}")
        await websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "initialized",
                "target": "session"
            }
        })

    elif message_type == "ping":
        # Respond to ping
        await websocket_manager.send_json(session_id, {
            "type": "pong"
        })

    elif message_type == "text":
        # Process text from user
        user_message = data.get("data", {}).get("text", "")
        if user_message:
            # Send processing start notification
            await websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "start",
                    "target": "processing"
                }
            })

            try:
                # Process message and get response
                response_text, audio_response = await voice_assistant_service.process_conversation(
                    session_id, user_message
                )

                # Check connection again before sending response
                if not websocket_manager.is_connected(session_id):
                    logger.warning(f"Session {session_id} disconnected during text processing")
                    return

                # Send text response
                await websocket_manager.send_json(session_id, {
                    "type": "text",
                    "data": {
                        "text": response_text,
                        "role": "assistant"
                    }
                })

                # Send binary audio response if available
                if audio_response and websocket_manager.is_connected(session_id):
                    await websocket_manager.send_bytes(session_id, audio_response)

            except Exception as e:
                logger.error(f"Error processing text for session {session_id}: {str(e)}")
                if websocket_manager.is_connected(session_id):
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": "Error processing your message"
                        }
                    })
            finally:
                # Send processing end notification if still connected
                if websocket_manager.is_connected(session_id):
                    await websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "stop",
                            "target": "processing"
                        }
                    })

    elif message_type == "presentation_control":
        # Handle presentation control commands
        action = data.get("data", {}).get("action", "")
        logger.info(f"Received presentation control action: {action} for session {session_id}")

        if action == "advance_slide":
            try:
                # Critical section - this is where connection often fails
                # First send an acknowledgment to keep the connection alive
                await websocket_manager.send_json(session_id, {
                    "type": "processing_status",
                    "data": {
                        "status": "processing",
                        "message": "Advancing slide..."
                    }
                })

                # Small delay to ensure frontend received the status
                await asyncio.sleep(0.1)

                # Run slide advancement in a non-blocking way
                slide_info = await asyncio.to_thread(voice_assistant_service.advance_slide, session_id)

                if "error" in slide_info:
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": slide_info["error"]
                        }
                    })
                    return

                # Send presentation update notification
                await websocket_manager.send_json(session_id, {
                    "type": "presentation_update",
                    "data": {
                        "current_slide": slide_info["slide_number"],
                        "current_presenter": slide_info["presenter"],
                        "total_slides": slide_info["total_slides"]
                    }
                })

                # If it's AI's turn to present, generate and send presentation
                if slide_info["presenter"] == "ai":
                    # Send processing start notification
                    await websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "start",
                            "target": "processing"
                        }
                    })

                    # Get presentation state for persona info
                    state = voice_assistant_service.get_presentation_state(session_id)

                    # Process the AI presentation turn
                    presentation_text, audio_response = await voice_assistant_service.process_presentation_turn(
                        session_id, slide_info["slide_number"]
                    )

                    # Check connection before sending response
                    if not websocket_manager.is_connected(session_id):
                        logger.warning(f"Session {session_id} disconnected during AI presentation")
                        return

                    # Send text response
                    await websocket_manager.send_json(session_id, {
                        "type": "text",
                        "data": {
                            "text": presentation_text,
                            "role": "assistant"
                        }
                    })

                    # Send binary audio response
                    if audio_response and websocket_manager.is_connected(session_id):
                        # Send playback start notification
                        await websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "start",
                                "target": "playback"
                            }
                        })

                        await websocket_manager.send_bytes(session_id, audio_response)

                    # Send processing end notification
                    if websocket_manager.is_connected(session_id):
                        await websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "stop",
                                "target": "processing"
                            }
                        })
            except Exception as e:
                logger.error(f"Error handling advance_slide for session {session_id}: {str(e)}")
                if websocket_manager.is_connected(session_id):
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": f"Error advancing slide: {str(e)}"
                        }
                    })

        elif action == "present_slide":
            try:
                # Get state without blocking
                state = await asyncio.to_thread(voice_assistant_service.get_presentation_state, session_id)
                current_slide = state["current_slide"]

                # If it's AI's turn to present, generate and send presentation
                if state["current_presenter"] == "ai":
                    # Send processing start notification
                    await websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "start",
                            "target": "processing"
                        }
                    })

                    # Process the AI presentation turn
                    presentation_text, audio_response = await voice_assistant_service.process_presentation_turn(
                        session_id, current_slide
                    )

                    # Check connection before continuing
                    if not websocket_manager.is_connected(session_id):
                        return

                    # Send text response
                    await websocket_manager.send_json(session_id, {
                        "type": "text",
                        "data": {
                            "text": presentation_text,
                            "role": "assistant"
                        }
                    })

                    # Send binary audio response
                    if audio_response and websocket_manager.is_connected(session_id):
                        # Send playback start notification
                        await websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "start",
                                "target": "playback"
                            }
                        })

                        await websocket_manager.send_bytes(session_id, audio_response)

                    # Send processing end notification if still connected
                    if websocket_manager.is_connected(session_id):
                        await websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "stop",
                                "target": "processing"
                            }
                        })
            except Exception as e:
                logger.error(f"Error handling present_slide for session {session_id}: {str(e)}")
                if websocket_manager.is_connected(session_id):
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": f"Error presenting slide: {str(e)}"
                        }
                    })

        elif action == "end_presentation":
            try:
                # Run in non-blocking way
                success = await asyncio.to_thread(voice_assistant_service.end_presentation, session_id)

                # Send presentation update notification
                await websocket_manager.send_json(session_id, {
                    "type": "presentation_update",
                    "data": {
                        "presentation_active": False
                    }
                })

                # Generate and send concluding message
                conclusion_text = "The presentation has concluded. I hope it was helpful. Would you like feedback on your presentation?"
                audio_response = await voice_assistant_service.generate_speech(conclusion_text)

                # Send text response
                await websocket_manager.send_json(session_id, {
                    "type": "text",
                    "data": {
                        "text": conclusion_text,
                        "role": "assistant"
                    }
                })

                # Send binary audio response
                if audio_response and websocket_manager.is_connected(session_id):
                    await websocket_manager.send_bytes(session_id, audio_response)
            except Exception as e:
                logger.error(f"Error ending presentation for session {session_id}: {str(e)}")
                if websocket_manager.is_connected(session_id):
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": f"Error ending presentation: {str(e)}"
                        }
                    })


async def handle_binary_message(session_id: str, audio_data: bytes):
    """
    Handle binary messages (audio data) from the client

    Args:
        session_id (str): Session identifier
        audio_data (bytes): Audio data
    """
    if not websocket_manager.is_connected(session_id):
        logger.warning(f"Attempt to process audio for inactive session: {session_id}")
        return

    try:
        # Send processing start notification
        await websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "start",
                "target": "processing"
            }
        })

        # Process audio and get transcription
        transcription = await voice_assistant_service.process_audio(audio_data, session_id)

        if not transcription:
            logger.warning(f"Empty transcription received for session {session_id}")
            # Send processing end notification even for empty transcription
            if websocket_manager.is_connected(session_id):
                await websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing"
                    }
                })
            return

        # Check connection before continuing
        if not websocket_manager.is_connected(session_id):
            return

        # Send transcription message
        await websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": transcription,
                "role": "user"
            }
        })

        # Check if this is a presentation session
        is_presentation = False
        try:
            if hasattr(voice_assistant_service,
                       'presentation_states') and session_id in voice_assistant_service.presentation_states:
                state = voice_assistant_service.presentation_states[session_id]
                is_presentation = getattr(state, 'presentation_active', False)

                # If it's a presentation and human is presenting, just acknowledge
                if is_presentation and state.current_presenter == "human":
                    try:
                        # Check if transcription contains keywords to advance slide
                        if "next slide" in transcription.lower() or "advance slide" in transcription.lower():
                            # Acknowledge the command
                            await websocket_manager.send_json(session_id, {
                                "type": "text",
                                "data": {
                                    "text": "Advancing to the next slide...",
                                    "role": "assistant"
                                }
                            })

                            # Create a task to handle slide advancement separately
                            websocket_manager.create_task(
                                session_id,
                                handle_text_message(session_id, {
                                    "type": "presentation_control",
                                    "data": {
                                        "action": "advance_slide"
                                    }
                                })
                            )

                            # Send processing end notification
                            if websocket_manager.is_connected(session_id):
                                await websocket_manager.send_json(session_id, {
                                    "type": "control",
                                    "data": {
                                        "action": "stop",
                                        "target": "processing"
                                    }
                                })
                            return

                        # Record the transcription for feedback in non-blocking way
                        current_slide = state.current_slide
                        # Run in a separate task to avoid blocking
                        await asyncio.to_thread(
                            voice_assistant_service.record_presentation_transcription,
                            session_id, current_slide, transcription
                        )

                        # Provide acknowledgment
                        ack_text = "I'm listening to your presentation. Continue when you're ready, or say 'next slide' to advance."
                        audio_response = await voice_assistant_service.generate_speech(ack_text)

                        # Verify connection is still active before sending
                        if websocket_manager.is_connected(session_id):
                            # Send text response
                            await websocket_manager.send_json(session_id, {
                                "type": "text",
                                "data": {
                                    "text": ack_text,
                                    "role": "assistant"
                                }
                            })

                            # Send audio response
                            if audio_response and websocket_manager.is_connected(session_id):
                                await websocket_manager.send_bytes(session_id, audio_response)
                    except Exception as e:
                        logger.error(f"Error handling human presentation for session {session_id}: {str(e)}")

                    # Send processing end notification
                    if websocket_manager.is_connected(session_id):
                        await websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "stop",
                                "target": "processing"
                            }
                        })
                    return
        except Exception as e:
            logger.error(f"Error checking presentation state: {str(e)}")
            # Continue with normal conversation processing if there's an error

        # Process regular conversation with the transcribed text
        try:
            # Send an interim message to prevent timeout
            await websocket_manager.send_json(session_id, {
                "type": "processing_status",
                "data": {
                    "status": "processing",
                    "message": "Processing your message..."
                }
            })

            # Use a separate thread to avoid blocking the event loop
            response_text, audio_response = await asyncio.to_thread(
                lambda: asyncio.run(voice_assistant_service.process_conversation(session_id, transcription))
            )

            # Verify connection is still active before sending
            if websocket_manager.is_connected(session_id):
                # Send text response
                await websocket_manager.send_json(session_id, {
                    "type": "text",
                    "data": {
                        "text": response_text,
                        "role": "assistant"
                    }
                })

                # Send binary audio response
                if audio_response and websocket_manager.is_connected(session_id):
                    # Send playback start notification
                    await websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "start",
                            "target": "playback"
                        }
                    })

                    # Send audio in chunks to prevent blocking
                    await websocket_manager.send_bytes(session_id, audio_response)
        except Exception as e:
            logger.error(f"Error processing conversation for session {session_id}: {str(e)}")
            # Try to send error notification if still connected
            if websocket_manager.is_connected(session_id):
                try:
                    await websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": "Error processing your message. Please try again."
                        }
                    })
                except:
                    pass

    except Exception as e:
        logger.error(f"Error in binary message handler for session {session_id}: {str(e)}")
    finally:
        # Always send processing end notification, even if an error occurred
        if websocket_manager.is_connected(session_id):
            try:
                await websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing"
                    }
                })
            except Exception as e:
                logger.error(f"Failed to send final processing stop notification: {str(e)}")