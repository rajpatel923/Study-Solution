import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import WebSocket, WebSocketDisconnect, Query, Depends
from starlette.types import Scope, Receive, Send

from app.services.voice_assistant_service import voice_assistant_service
from app.utils.websocket_manager import enhanced_websocket_manager
from app.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)
settings = get_settings()

# Message tracking data structure for improved reliability
message_tracking = {}


# Modify the websocket_endpoint function in web_sockets.py

async def websocket_endpoint_improved(
        websocket: WebSocket,
        session_id: str = Query(..., description="Session identifier"),
        recover: bool = Query(False, description="Whether to attempt session recovery"),
        last_message_id: Optional[str] = Query(None, description="Last received message ID for recovery")
):
    """
    Enhanced WebSocket endpoint for voice assistant communication with improved reliability and debugging

    Args:
        websocket (WebSocket): WebSocket connection
        session_id (str): Session identifier from query params
        recover (bool): Whether to attempt session recovery
        last_message_id (Optional[str]): Last received message ID for recovery
    """
    # Generate unique connection ID for tracking
    connection_id = str(uuid.uuid4())

    # Store heartbeat task for later cancellation
    heartbeat_task = None
    connection_monitor_task = None

    try:
        # Log connection attempt with identifiers
        logger.info(f"DEBUG: WebSocket connection attempt: session={session_id}, connection={connection_id}")
        logger.info(
            f"DEBUG: WebSocket query params: sessionId={session_id}, recover={recover}, last_message_id={last_message_id}")

        # Log client information
        client_headers = getattr(websocket, "headers", {})
        client_host = getattr(websocket, "client", {})
        logger.info(f"DEBUG: Client host: {client_host}")
        logger.info(f"DEBUG: Client headers: {client_headers}")

        # Accept the connection with proper error handling and debugging
        try:
            # Use enhanced debug connect
            await enhanced_websocket_manager.debug_connect(websocket, session_id)
            logger.info(f"DEBUG: WebSocket connection accepted: session={session_id}, connection={connection_id}")
        except Exception as e:
            logger.error(
                f"DEBUG: Error accepting WebSocket connection: session={session_id}, connection={connection_id}, error={str(e)}")
            import traceback
            logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

            # Try a raw accept if the manager failed
            try:
                logger.info(f"DEBUG: Attempting raw websocket.accept() as fallback")
                await websocket.accept()
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": "Error establishing connection with session manager",
                        "recoverable": False
                    },
                    "timestamp": datetime.now().isoformat(),
                    "message_id": str(uuid.uuid4())
                })
                await websocket.close(1011)  # 1011 = Internal Error
                logger.info(f"DEBUG: Raw fallback connection succeeded but then closed with error code")
            except Exception as raw_error:
                logger.error(f"DEBUG: Raw fallback websocket.accept() also failed: {raw_error}")
                import traceback
                logger.error(f"DEBUG: Raw fallback traceback: {traceback.format_exc()}")
            return

        # Check connection status
        connection_status = enhanced_websocket_manager.debug_connection_status(session_id)
        logger.info(f"DEBUG: Connection status after accept: {connection_status}")

        # Attempt session recovery if requested
        if recover and last_message_id:
            logger.info(f"DEBUG: Attempting session recovery: session={session_id}, last_message={last_message_id}")
            recovery_success = await enhanced_websocket_manager.recover_session(session_id, last_message_id)

            recovery_status = "successful" if recovery_success else "failed"
            logger.info(f"DEBUG: Session recovery {recovery_status}: session={session_id}")

            await enhanced_websocket_manager.send_json(session_id, {
                "type": "recovery_status",
                "data": {
                    "success": recovery_success,
                    "message": f"Session recovery {recovery_status}"
                }
            })

        # Send initial connection confirmation with session state
        try:
            logger.info(f"DEBUG: Sending initial connection confirmation for session={session_id}")
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "connection_status",
                "data": {
                    "status": "connected",
                    "message": "WebSocket connection established",
                    "session_id": session_id,
                    "connection_id": connection_id,
                    "server_time": datetime.now().isoformat()
                }
            })
            logger.info(f"DEBUG: Successfully sent initial confirmation for session={session_id}")
        except Exception as e:
            logger.error(f"DEBUG: Error sending initial confirmation: session={session_id}, error={str(e)}")
            import traceback
            logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
            # Non-fatal, continue

        # Initialize the session with voice assistant service if needed
        try:
            if hasattr(voice_assistant_service,
                       'session_data') and session_id not in voice_assistant_service.session_data:
                logger.info(f"DEBUG: Initializing voice assistant session for {session_id}")
                voice_assistant_service.session_data[session_id] = {
                    "messages": []
                }
                logger.info(f"DEBUG: Successfully initialized voice assistant session for {session_id}")
        except Exception as e:
            logger.error(f"DEBUG: Error initializing voice assistant session: {str(e)}")
            # Non-fatal, continue

        # Send initialization success message
        try:
            logger.info(f"DEBUG: Sending session initialization confirmation for session={session_id}")
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "initialized",
                    "target": "session",
                    "operation_id": str(uuid.uuid4())
                }
            })
            logger.info(f"DEBUG: Successfully sent initialization confirmation for session={session_id}")
        except Exception as e:
            logger.error(f"DEBUG: Error sending initialization confirmation: {str(e)}")
            # Non-fatal, continue

        # Register a heartbeat task to detect stale connections
        async def heartbeat():
            """Heartbeat function to keep connection alive and detect stale connections"""
            try:
                while enhanced_websocket_manager.is_connected(session_id):
                    try:
                        # Check if presentation mode is active to adjust heartbeat frequency
                        is_presenting = (
                                hasattr(voice_assistant_service, 'presentation_states') and
                                session_id in voice_assistant_service.presentation_states and
                                getattr(voice_assistant_service.presentation_states[session_id], 'presentation_active',
                                        False)
                        )

                        # Send heartbeat with timestamps for latency calculation
                        logger.info(f"DEBUG: Sending heartbeat to session={session_id}")
                        await enhanced_websocket_manager.send_json(session_id, {
                            "type": "heartbeat",
                            "data": {
                                "timestamp": datetime.now().isoformat(),
                                "server_time_ms": int(time.time() * 1000)
                            }
                        })
                        logger.info(f"DEBUG: Successfully sent heartbeat to session={session_id}")

                        # More frequent during presentations
                        wait_time = 15 if is_presenting else 30
                        await asyncio.sleep(wait_time)
                    except asyncio.CancelledError:
                        # Heartbeat cancellation is normal during shutdown
                        logger.debug(f"DEBUG: Heartbeat task cancelled: session={session_id}")
                        break
                    except Exception as e:
                        logger.error(f"DEBUG: Error in heartbeat: session={session_id}, error={str(e)}")
                        # Don't crash the heartbeat loop on errors
                        await asyncio.sleep(5)  # Short delay before retry
            except WebSocketDisconnect:
                logger.info(f"DEBUG: Heartbeat detected disconnection: session={session_id}")
            except Exception as e:
                logger.error(f"DEBUG: Heartbeat error: session={session_id}, error={str(e)}")
            finally:
                logger.info(f"DEBUG: Heartbeat task ended: session={session_id}")

        # Start heartbeat in background with tracking
        logger.info(f"DEBUG: Starting heartbeat task for session={session_id}")
        heartbeat_task = enhanced_websocket_manager.create_task(
            session_id,
            heartbeat(),
            "heartbeat"
        )
        logger.info(f"DEBUG: Heartbeat task started for session={session_id}")

        # Initialize session tracking
        if session_id not in message_tracking:
            message_tracking[session_id] = {
                'last_message_time': time.time(),
                'last_pong_time': 0,
                'message_counter': 0
            }

        # After connection is established and initial messages sent, check for pending presentation state
        try:
            logger.info(f"DEBUG: Checking for existing presentation state for {session_id}")
            presentation_state = await asyncio.to_thread(voice_assistant_service.get_presentation_state, session_id)

            if "error" not in presentation_state and presentation_state.get("presentation_active", False):
                logger.info(f"DEBUG: Found active presentation for {session_id}, sending state update")
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "presentation_update",
                    "data": presentation_state
                })
                logger.info(f"DEBUG: Successfully sent presentation state update for {session_id}")
            else:
                logger.info(f"DEBUG: No active presentation found for {session_id} or error in response")
        except Exception as e:
            logger.error(f"DEBUG: Error checking for existing presentation state: {str(e)}")
            # Non-fatal, continue

        # Main message handling loop with better error boundaries
        logger.info(f"DEBUG: Starting main message loop for session={session_id}")
        while True:
            try:
                # Verify connection is still valid before receiving
                if not enhanced_websocket_manager.is_connected(session_id):
                    logger.info(f"DEBUG: Connection no longer active, stopping loop: session={session_id}")
                    break

                # Handle incoming messages (could be text or binary)
                try:
                    # Use receive with a timeout to avoid blocking forever
                    logger.info(f"DEBUG: Waiting for messages from session={session_id}")
                    message = await asyncio.wait_for(websocket.receive(), timeout=60.0)
                    logger.info(
                        f"DEBUG: Received message from session={session_id}, type: {message.get('type', 'unknown')}")

                    # Update last message time
                    message_tracking[session_id]['last_message_time'] = time.time()
                    message_tracking[session_id]['message_counter'] += 1
                except asyncio.TimeoutError:
                    # This is not necessarily an error - just a long quiet period
                    logger.info(
                        f"DEBUG: No messages received for 60 seconds, checking connection: session={session_id}")
                    # Connection monitoring task will handle this
                    continue

                # Handle text messages (JSON commands)
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        message_type = data.get('type', 'unknown')
                        logger.info(f"DEBUG: Received text message: session={session_id}, type={message_type}")

                        # Generate message ID if not provided
                        message_id = data.get('message_id', str(uuid.uuid4()))

                        # Handle special message types
                        if message_type == 'heartbeat_response' or message_type == 'pong':
                            # Update pong time
                            message_tracking[session_id]['last_pong_time'] = time.time()
                            continue

                        # Process the message in a background task to prevent blocking
                        logger.info(
                            f"DEBUG: Creating task to handle text message: session={session_id}, type={message_type}")
                        enhanced_websocket_manager.create_task(
                            session_id,
                            handle_text_message(session_id, data),
                            message_id
                        )
                        logger.info(
                            f"DEBUG: Task created to handle text message: session={session_id}, type={message_type}")
                    except json.JSONDecodeError:
                        logger.error(f"DEBUG: Invalid JSON received: session={session_id}")
                        try:
                            if enhanced_websocket_manager.is_connected(session_id):
                                await enhanced_websocket_manager.send_json(session_id, {
                                    "type": "error",
                                    "data": {
                                        "message": "Invalid JSON format"
                                    }
                                })
                        except Exception as e:
                            logger.error(f"DEBUG: Error sending JSON error message: {str(e)}")

                # Handle binary messages (audio data)
                elif "bytes" in message:
                    try:
                        binary_id = str(uuid.uuid4())
                        data_size = len(message["bytes"])
                        logger.info(
                            f"DEBUG: Received binary message: session={session_id}, id={binary_id}, size={data_size} bytes")

                        # Process audio in a background task to prevent blocking
                        logger.info(
                            f"DEBUG: Creating task to handle binary message: session={session_id}, id={binary_id}")
                        enhanced_websocket_manager.create_task(
                            session_id,
                            handle_binary_message(session_id, message["bytes"], binary_id),
                            binary_id
                        )
                        logger.info(
                            f"DEBUG: Task created to handle binary message: session={session_id}, id={binary_id}")
                    except Exception as e:
                        logger.error(f"DEBUG: Error processing audio: session={session_id}, error={str(e)}")
                        try:
                            if enhanced_websocket_manager.is_connected(session_id):
                                await enhanced_websocket_manager.send_json(session_id, {
                                    "type": "error",
                                    "data": {
                                        "message": "Error processing audio data"
                                    }
                                })
                        except Exception:
                            # If we can't send this error, the connection is probably dead
                            break

            except WebSocketDisconnect as e:
                logger.info(
                    f"DEBUG: WebSocket client disconnected: session={session_id}, code={getattr(e, 'code', 'unknown')}")
                break
            except Exception as e:
                logger.error(f"DEBUG: Error processing WebSocket message: session={session_id}, error={str(e)}")
                import traceback
                logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

                # Check if it's an ASGI disconnect error
                error_str = str(e).lower()
                if any(phrase in error_str for phrase in ["disconnect message", "cannot call", "websocket.close"]):
                    logger.info(f"DEBUG: Client appears disconnected, stopping message loop: session={session_id}")
                    break

                # Try to send error back to client
                try:
                    if enhanced_websocket_manager.is_connected(session_id):
                        await enhanced_websocket_manager.send_json(session_id, {
                            "type": "error",
                            "data": {
                                "message": f"Server error: {str(e)}"
                            }
                        })
                except Exception:
                    # If we can't send the message, assume disconnected
                    break

    except WebSocketDisconnect:
        logger.info(f"DEBUG: WebSocket client disconnected during setup: session={session_id}")
    except Exception as e:
        logger.error(f"DEBUG: WebSocket setup error: session={session_id}, error={str(e)}")
        import traceback
        logger.error(f"DEBUG: Setup error details: {traceback.format_exc()}")
    finally:
        # Always clean up properly
        logger.info(f"DEBUG: Cleaning up WebSocket connection: session={session_id}, connection={connection_id}")

        # Cancel heartbeat task if running
        if heartbeat_task and not heartbeat_task.done():
            try:
                logger.info(f"DEBUG: Cancelling heartbeat task for session={session_id}")
                heartbeat_task.cancel()
                await asyncio.sleep(0.1)  # Give it a moment to cancel
                logger.info(f"DEBUG: Heartbeat task cancelled for session={session_id}")
            except Exception as e:
                logger.warning(f"DEBUG: Error cancelling heartbeat task: {str(e)}")

        # Cancel connection monitor if running
        if connection_monitor_task and not connection_monitor_task.done():
            try:
                logger.info(f"DEBUG: Cancelling connection monitor task for session={session_id}")
                connection_monitor_task.cancel()
                await asyncio.sleep(0.1)  # Give it a moment to cancel
                logger.info(f"DEBUG: Connection monitor task cancelled for session={session_id}")
            except Exception as e:
                logger.warning(f"DEBUG: Error cancelling connection monitor task: {str(e)}")

        # Ensure we properly disconnect using the manager
        try:
            logger.info(f"DEBUG: Disconnecting session={session_id} using websocket manager")
            await enhanced_websocket_manager.disconnect(session_id)
            logger.info(f"DEBUG: Successfully disconnected session={session_id}")
        except Exception as e:
            logger.error(f"DEBUG: Error during final WebSocket cleanup: session={session_id}, error={str(e)}")
            import traceback
            logger.error(f"DEBUG: Cleanup error details: {traceback.format_exc()}")

        logger.info(f"DEBUG: WebSocket connection cleanup completed: session={session_id}, connection={connection_id}")


# Replace the original websocket_endpoint function
websocket_endpoint = websocket_endpoint_improved


async def handle_text_message(session_id: str, data: Dict[str, Any]):
    """
    Handle text/JSON messages from the client with enhanced reliability

    Args:
        session_id (str): Session identifier
        data (Dict[str, Any]): Message data
    """
    # Generate an operation ID for tracking this request
    operation_id = data.get('message_id', str(uuid.uuid4()))

    if not enhanced_websocket_manager.is_connected(session_id):
        logger.warning(
            f"Attempt to handle message for disconnected session: session={session_id}, operation={operation_id}")
        return

    message_type = data.get("type", "")
    logger.info(f"Processing text message: session={session_id}, type={message_type}, operation={operation_id}")

    try:
        # Send acknowledgment of message receipt
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "message_received",
            "data": {
                "original_type": message_type,
                "operation_id": operation_id,
                "timestamp": datetime.now().isoformat()
            }
        })

        # Handle different message types
        if message_type == "init":
            # Handle initialization message
            logger.info(f"Initializing session: session={session_id}, operation={operation_id}")
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "initialized",
                    "target": "session",
                    "operation_id": operation_id
                }
            })

        elif message_type == "ping":
            # Respond to ping with more diagnostics
            logger.debug(f"Ping received: session={session_id}")
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "pong",
                "data": {
                    "server_time": datetime.now().isoformat(),
                    "server_time_ms": int(time.time() * 1000),
                    "original_ping_time": data.get("data", {}).get("timestamp")
                }
            })

        elif message_type == "text":
            # Process text from user
            user_message = data.get("data", {}).get("text", "")
            if user_message:
                # Send processing start notification
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "start",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })

                try:
                    # Process message and get response with timeout protection
                    try:
                        # Use a task with timeout to prevent blocking indefinitely
                        response_text, audio_response = await asyncio.wait_for(
                            voice_assistant_service.process_conversation(session_id, user_message),
                            timeout=60.0  # 60 second timeout for processing
                        )
                    except asyncio.TimeoutError:
                        logger.error(f"Timeout processing text: session={session_id}, operation={operation_id}")
                        if enhanced_websocket_manager.is_connected(session_id):
                            await enhanced_websocket_manager.send_json(session_id, {
                                "type": "error",
                                "data": {
                                    "message": "Processing timeout - the server took too long to respond",
                                    "operation_id": operation_id,
                                    "recoverable": True
                                }
                            })
                        return

                    # Check connection again before sending response
                    if not enhanced_websocket_manager.is_connected(session_id):
                        logger.warning(
                            f"Session disconnected during text processing: session={session_id}, operation={operation_id}")
                        return

                    # Send text response
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "text",
                        "data": {
                            "text": response_text,
                            "role": "assistant",
                            "operation_id": operation_id
                        }
                    })

                    # Send binary audio response if available
                    if audio_response and enhanced_websocket_manager.is_connected(session_id):
                        await enhanced_websocket_manager.send_bytes(session_id, audio_response)

                        # Send playback start notification
                        await enhanced_websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "start",
                                "target": "playback",
                                "operation_id": operation_id
                            }
                        })

                except Exception as e:
                    logger.error(
                        f"Error processing text: session={session_id}, operation={operation_id}, error={str(e)}")
                    if enhanced_websocket_manager.is_connected(session_id):
                        await enhanced_websocket_manager.send_json(session_id, {
                            "type": "error",
                            "data": {
                                "message": "Error processing your message",
                                "details": str(e),
                                "operation_id": operation_id
                            }
                        })
                finally:
                    # Send processing end notification if still connected
                    if enhanced_websocket_manager.is_connected(session_id):
                        await enhanced_websocket_manager.send_json(session_id, {
                            "type": "control",
                            "data": {
                                "action": "stop",
                                "target": "processing",
                                "operation_id": operation_id
                            }
                        })

        elif message_type == "presentation_control":
            # Handle presentation control commands with improved error handling
            action = data.get("data", {}).get("action", "")
            logger.info(
                f"Received presentation control: session={session_id}, action={action}, operation={operation_id}")

            # Send processing status
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "processing_status",
                "data": {
                    "status": "processing",
                    "message": f"{action} in progress...",
                    "operation_id": operation_id
                }
            })

            # Small delay to ensure frontend received the status
            await asyncio.sleep(0.1)

            if action == "advance_slide":
                await handle_advance_slide(session_id, operation_id)
            elif action == "present_slide":
                await handle_present_slide(session_id, operation_id)
            elif action == "end_presentation":
                await handle_end_presentation(session_id, operation_id)
            elif action == "request_feedback":
                await handle_request_feedback(session_id, operation_id)
            else:
                logger.warning(f"Unknown presentation control action: session={session_id}, action={action}")
                if enhanced_websocket_manager.is_connected(session_id):
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": f"Unknown presentation control action: {action}",
                            "operation_id": operation_id
                        }
                    })

    except Exception as e:
        logger.error(f"Error in text message handler: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error processing message: {str(e)}",
                    "operation_id": operation_id
                }
            })


async def handle_binary_message(session_id: str, audio_data: bytes, operation_id: str):
    """
    Handle binary messages (audio data) from the client with enhanced reliability

    Args:
        session_id (str): Session identifier
        audio_data (bytes): Audio data
        operation_id (str): Operation identifier for tracking
    """
    if not enhanced_websocket_manager.is_connected(session_id):
        logger.warning(f"Attempt to process audio for inactive session: session={session_id}, operation={operation_id}")
        return

    try:
        # Log audio reception
        logger.info(f"Processing audio: session={session_id}, operation={operation_id}, size={len(audio_data)} bytes")

        # Send processing start notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "start",
                "target": "processing",
                "operation_id": operation_id
            }
        })

        # Process audio and get transcription with timeout protection
        try:
            transcription = await asyncio.wait_for(
                voice_assistant_service.process_audio(audio_data, session_id),
                timeout=15.0  # 15 second timeout for audio transcription
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout transcribing audio: session={session_id}, operation={operation_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Audio transcription timeout - the server took too long to process your audio",
                        "operation_id": operation_id,
                        "recoverable": True
                    }
                })

                # End processing state
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })
            return

        if not transcription:
            logger.warning(f"Empty transcription received: session={session_id}, operation={operation_id}")
            # Send processing end notification even for empty transcription
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })

                # Send notice to user
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "transcription_status",
                    "data": {
                        "status": "empty",
                        "message": "No speech detected in audio",
                        "operation_id": operation_id
                    }
                })
            return

        # Check connection before continuing
        if not enhanced_websocket_manager.is_connected(session_id):
            logger.warning(
                f"Session disconnected during audio processing: session={session_id}, operation={operation_id}")
            return

        # Send transcription message
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": transcription,
                "role": "user",
                "operation_id": operation_id
            }
        })

        # Handle special cases for presentation mode
        is_presentation = False
        is_human_turn = False
        try:
            # Check if this is a presentation session
            if hasattr(voice_assistant_service,
                       'presentation_states') and session_id in voice_assistant_service.presentation_states:
                state = voice_assistant_service.presentation_states[session_id]
                is_presentation = getattr(state, 'presentation_active', False)
                is_human_turn = is_presentation and state.current_presenter == "human"

                # If it's a presentation, handle with presentation logic
                if is_presentation:
                    await handle_presentation_audio(session_id, transcription, operation_id, is_human_turn)
                    return
        except Exception as e:
            logger.error(
                f"Error checking presentation state: session={session_id}, operation={operation_id}, error={str(e)}")
            # Continue with normal conversation processing if there's an error

        # Process regular conversation with transcribed text
        try:
            # Send an interim message to prevent timeout
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "processing_status",
                "data": {
                    "status": "processing",
                    "message": "Processing your message...",
                    "operation_id": operation_id
                }
            })

            # Process with timeout protection
            try:
                response_text, audio_response = await asyncio.wait_for(
                    voice_assistant_service.process_conversation(session_id, transcription),
                    timeout=45.0  # 45 second timeout
                )
            except asyncio.TimeoutError:
                logger.error(f"Timeout processing conversation: session={session_id}, operation={operation_id}")
                if enhanced_websocket_manager.is_connected(session_id):
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": "Processing timeout - the server took too long to respond",
                            "operation_id": operation_id,
                            "recoverable": True
                        }
                    })

                    # End processing state
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "stop",
                            "target": "processing",
                            "operation_id": operation_id
                        }
                    })
                return

            # Verify connection is still active before sending
            if enhanced_websocket_manager.is_connected(session_id):
                # Send text response
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "text",
                    "data": {
                        "text": response_text,
                        "role": "assistant",
                        "operation_id": operation_id
                    }
                })

                # Send binary audio response
                if audio_response and enhanced_websocket_manager.is_connected(session_id):
                    await enhanced_websocket_manager.send_bytes(session_id, audio_response)

                    # Send playback start notification
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "start",
                            "target": "playback",
                            "operation_id": operation_id
                        }
                    })
        except Exception as e:
            logger.error(
                f"Error processing conversation: session={session_id}, operation={operation_id}, error={str(e)}")
            # Try to send error notification if still connected
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Error processing your message. Please try again.",
                        "details": str(e),
                        "operation_id": operation_id
                    }
                })

    except Exception as e:
        logger.error(f"Error in binary message handler: session={session_id}, operation={operation_id}, error={str(e)}")
    finally:
        # Always send processing end notification, even if an error occurred
        if enhanced_websocket_manager.is_connected(session_id):
            try:
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })
            except Exception as e:
                logger.error(f"Failed to send final processing stop notification: {str(e)}")


async def handle_presentation_audio(session_id: str, transcription: str, operation_id: str, is_human_turn: bool):
    """
    Handle audio in presentation mode with appropriate logic based on presenter turn

    Args:
        session_id: Session identifier
        transcription: Transcribed text
        operation_id: Operation identifier for tracking
        is_human_turn: Whether it's human's turn to present
    """
    try:
        # Get presentation state
        state = voice_assistant_service.presentation_states[session_id]
        current_slide = state.current_slide

        # Log activity with context
        logger.info(
            f"Handling presentation audio: session={session_id}, slide={current_slide}, human_turn={is_human_turn}, operation={operation_id}")

        # Check for command keywords in transcription regardless of whose turn it is
        lower_transcription = transcription.lower()

        # Check for slide advancement commands
        if any(cmd in lower_transcription for cmd in
               ["next slide", "advance slide", "continue", "move on", "go ahead", "next"]):

            # Acknowledge the command
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": "Advancing to the next slide...",
                    "role": "assistant",
                    "operation_id": operation_id
                }
            })

            # Handle slide advancement
            await handle_advance_slide(session_id, operation_id)
            return

        # Check for end presentation commands
        elif any(cmd in lower_transcription for cmd in
                 ["end presentation", "finish presentation", "conclude", "wrap up", "finish", "end"]):

            # Acknowledge the command
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": "Ending the presentation...",
                    "role": "assistant",
                    "operation_id": operation_id
                }
            })

            # Handle presentation ending
            await handle_end_presentation(session_id, operation_id)
            return

        # Check for feedback request commands
        elif any(cmd in lower_transcription for cmd in
                 ["feedback", "how did i do", "evaluate", "assess", "review"]):

            # Acknowledge the command
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": "Generating presentation feedback...",
                    "role": "assistant",
                    "operation_id": operation_id
                }
            })

            # Handle feedback request
            await handle_request_feedback(session_id, operation_id)
            return

        # If it's human's turn to present, record the transcription for feedback
        if is_human_turn:
            # Record the transcription for future feedback
            await voice_assistant_service.record_presentation_transcription(
                session_id, current_slide, transcription
            )

            logger.info(
                f"Recorded human presentation transcription: session={session_id}, slide={current_slide}, length={len(transcription)}")

            # Provide minimal acknowledgment to keep the presentation flowing
            ack_text = "I'm listening to your presentation. Continue when you're ready, or say 'next slide' to advance."

            # Generate audio for acknowledgment
            audio_response = await voice_assistant_service.generate_speech(ack_text)

            # Send text response
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": ack_text,
                    "role": "assistant",
                    "operation_id": operation_id,
                    "context": "presentation_listening"
                }
            })

            # Send audio response
            if audio_response and enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_bytes(session_id, audio_response)

            return

        # If it's not human's turn but they spoke anyway, give a gentle reminder
        else:
            reminder_text = f"It's currently my turn to present slide {current_slide}. You can say 'next slide' when you're ready to advance."

            # Generate audio for reminder
            audio_response = await voice_assistant_service.generate_speech(reminder_text)

            # Send text response
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": reminder_text,
                    "role": "assistant",
                    "operation_id": operation_id,
                    "context": "presentation_reminder"
                }
            })

            # Send audio response
            if audio_response and enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_bytes(session_id, audio_response)

            return

    except Exception as e:
        logger.error(
            f"Error handling presentation audio: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error processing presentation audio: {str(e)}",
                    "operation_id": operation_id
                }
            })


async def handle_advance_slide(session_id: str, operation_id: str):
    """
    Handle advancing to the next presentation slide with robust error handling

    Args:
        session_id: Session identifier
        operation_id: Operation identifier for tracking
    """
    try:
        # Run slide advancement in a non-blocking way with timeout protection
        try:
            slide_info = await asyncio.wait_for(
                asyncio.to_thread(voice_assistant_service.advance_slide, session_id),
                timeout=10.0  # 10 second timeout for slide advancement
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout advancing slide: session={session_id}, operation={operation_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Timeout while advancing slide",
                        "operation_id": operation_id,
                        "recoverable": True
                    }
                })
            return

        # Check for error in slide info
        if "error" in slide_info:
            # Check if we're at the last slide
            if "last slide" in slide_info["error"].lower():
                logger.info(f"Reached last slide: session={session_id}, operation={operation_id}")

                # Handle presentation completion
                await handle_presentation_completion(session_id, operation_id)
                return
            else:
                # Send error to client
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": slide_info["error"],
                        "operation_id": operation_id
                    }
                })
                return

        # Send presentation update notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "presentation_update",
            "data": {
                "current_slide": slide_info["slide_number"],
                "current_presenter": slide_info["presenter"],
                "total_slides": slide_info["total_slides"],
                "operation_id": operation_id
            }
        })

        # If it's AI's turn to present, generate and send presentation
        if slide_info["presenter"] == "ai":
            # Send processing start notification
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "start",
                    "target": "processing",
                    "operation_id": operation_id
                }
            })

            try:
                # Process the AI presentation turn with timeout protection
                presentation_text, audio_response = await asyncio.wait_for(
                    voice_assistant_service.process_presentation_turn(
                        session_id, slide_info["slide_number"]
                    ),
                    timeout=30.0  # 30 second timeout for presentation generation
                )
            except asyncio.TimeoutError:
                logger.error(
                    f"Timeout generating presentation: session={session_id}, slide={slide_info['slide_number']}, operation={operation_id}")
                if enhanced_websocket_manager.is_connected(session_id):
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "error",
                        "data": {
                            "message": "Timeout generating presentation for this slide",
                            "operation_id": operation_id,
                            "recoverable": True
                        }
                    })

                    # End processing state
                    await enhanced_websocket_manager.send_json(session_id, {
                        "type": "control",
                        "data": {
                            "action": "stop",
                            "target": "processing",
                            "operation_id": operation_id
                        }
                    })
                return

            # Check connection before sending response
            if not enhanced_websocket_manager.is_connected(session_id):
                logger.warning(
                    f"Session disconnected during AI presentation: session={session_id}, operation={operation_id}")
                return

            # Send text response
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": presentation_text,
                    "role": "assistant",
                    "operation_id": operation_id,
                    "context": "presentation"
                }
            })

            # Send binary audio response
            if audio_response and enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_bytes(session_id, audio_response)

                # Send playback start notification
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "start",
                        "target": "playback",
                        "operation_id": operation_id
                    }
                })

            # Send processing end notification
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })
        else:
            # If it's human's turn, send guidance message
            human_guidance = f"It's your turn to present slide {slide_info['slide_number']}. When you're ready to move on, say 'next slide'."

            # Generate audio for guidance
            audio_response = await voice_assistant_service.generate_speech(human_guidance)

            # Send text guidance
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": human_guidance,
                    "role": "assistant",
                    "operation_id": operation_id,
                    "context": "presentation_guidance"
                }
            })

            # Send audio guidance
            if audio_response and enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_bytes(session_id, audio_response)

    except Exception as e:
        logger.error(f"Error handling advance_slide: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error advancing slide: {str(e)}",
                    "operation_id": operation_id
                }
            })


async def handle_present_slide(session_id: str, operation_id: str):
    """
    Handle AI presenting the current slide with better logging and error handling
    """
    try:
        # Get presentation state in non-blocking way with timeout
        logger.info(f"Starting slide presentation for session {session_id}")

        # Get current state
        state = voice_assistant_service.get_presentation_state(session_id)
        current_slide = state.get("current_slide", 1)

        # Log state information
        logger.info(f"Presentation state: slide={current_slide}, presenter={state.get('current_presenter')}")

        # Check if presentation is active
        if not state.get("presentation_active", False):
            logger.error(f"No active presentation found for session {session_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "No active presentation found",
                        "operation_id": operation_id
                    }
                })
            return

        # Check whose turn it is
        if state.get("current_presenter") != "ai":
            logger.info(f"Not AI's turn to present for session {session_id}")
            # Send guidance for human presenter
            human_guidance = f"It's your turn to present slide {current_slide}. When you're ready to move on, say 'next slide'."

            # Generate audio for guidance
            audio_response = await voice_assistant_service.generate_speech(human_guidance)

            # Send text guidance
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "text",
                "data": {
                    "text": human_guidance,
                    "role": "assistant",
                    "operation_id": operation_id,
                    "context": "presentation_guidance"
                }
            })

            # Send audio guidance
            if audio_response and enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_bytes(session_id, audio_response)

            return

        # AI is presenting - send processing start notification
        logger.info(f"AI is presenting slide {current_slide} for session {session_id}")
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "start",
                "target": "processing",
                "operation_id": operation_id
            }
        })

        # Process the AI presentation turn with detailed logging
        logger.info(f"Calling process_presentation_turn for slide {current_slide}")
        presentation_text, audio_response = await voice_assistant_service.process_presentation_turn(
            session_id, current_slide
        )
        logger.info(
            f"Generated presentation text of length {len(presentation_text)} and audio of size {len(audio_response)} bytes")

        # Check connection before continuing
        if not enhanced_websocket_manager.is_connected(session_id):
            logger.warning(f"Session disconnected during AI presentation: session={session_id}")
            return

        # Send text response
        logger.info(f"Sending presentation text to client")
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": presentation_text,
                "role": "assistant",
                "operation_id": operation_id,
                "context": "presentation"
            }
        })

        # Send binary audio response
        if audio_response and enhanced_websocket_manager.is_connected(session_id):
            logger.info(f"Sending audio response to client")
            await enhanced_websocket_manager.send_bytes(session_id, audio_response)

            # Send playback start notification
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "start",
                    "target": "playback",
                    "operation_id": operation_id
                }
            })

        # Send processing end notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "stop",
                "target": "processing",
                "operation_id": operation_id
            }
        })

    except Exception as e:
        logger.error(f"Error handling present_slide: session={session_id}, operation={operation_id}, error={str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")

        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error presenting slide: {str(e)}",
                    "operation_id": operation_id
                }
            })

async def handle_end_presentation(session_id: str, operation_id: str):
    """
    Handle ending a presentation with completion message

    Args:
        session_id: Session identifier
        operation_id: Operation identifier for tracking
    """
    try:
        # End presentation in a non-blocking way
        try:
            success = await asyncio.wait_for(
                asyncio.to_thread(voice_assistant_service.end_presentation, session_id),
                timeout=5.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout ending presentation: session={session_id}, operation={operation_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Timeout ending presentation",
                        "operation_id": operation_id,
                        "recoverable": True
                    }
                })
            return

        if not success:
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": "Could not end presentation - no active presentation found",
                    "operation_id": operation_id
                }
            })
            return

        # Send presentation update notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "presentation_update",
            "data": {
                "presentation_active": False,
                "message": "Presentation ended",
                "operation_id": operation_id
            }
        })

        # Generate and send concluding message
        conclusion_text = "The presentation has concluded. I hope it was helpful. Would you like feedback on your presentation?"

        try:
            audio_response = await asyncio.wait_for(
                voice_assistant_service.generate_speech(conclusion_text),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout generating conclusion speech: session={session_id}, operation={operation_id}")
            audio_response = None

        # Send text response
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": conclusion_text,
                "role": "assistant",
                "operation_id": operation_id,
                "context": "presentation_conclusion"
            }
        })

        # Send binary audio response
        if audio_response and enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_bytes(session_id, audio_response)

    except Exception as e:
        logger.error(f"Error ending presentation: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error ending presentation: {str(e)}",
                    "operation_id": operation_id
                }
            })


async def handle_presentation_completion(session_id: str, operation_id: str):
    """
    Handle reaching the end of a presentation

    Args:
        session_id: Session identifier
        operation_id: Operation identifier for tracking
    """
    try:
        # Get completion message with timeout protection
        try:
            completion_text, audio_response = await asyncio.wait_for(
                voice_assistant_service.handle_presentation_completion(session_id),
                timeout=20.0
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout handling presentation completion: session={session_id}, operation={operation_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                # Send a fallback completion message
                completion_text = "You've completed all slides in the presentation. I hope it was helpful. Would you like feedback on your presentation?"
                audio_response = await voice_assistant_service.generate_speech(completion_text)

        # Send presentation update notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "presentation_update",
            "data": {
                "presentation_active": False,
                "message": "Presentation completed",
                "operation_id": operation_id
            }
        })

        # Send text response
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": completion_text,
                "role": "assistant",
                "operation_id": operation_id,
                "context": "presentation_completion"
            }
        })

        # Send binary audio response
        if audio_response and enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_bytes(session_id, audio_response)

    except Exception as e:
        logger.error(
            f"Error handling presentation completion: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error completing presentation: {str(e)}",
                    "operation_id": operation_id
                }
            })


async def handle_request_feedback(session_id: str, operation_id: str):
    """
    Handle request for presentation feedback

    Args:
        session_id: Session identifier
        operation_id: Operation identifier for tracking
    """
    try:
        # Send processing start notification
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "control",
            "data": {
                "action": "start",
                "target": "processing",
                "operation_id": operation_id
            }
        })

        # Generate feedback with timeout
        try:
            feedback_text, audio_response = await asyncio.wait_for(
                voice_assistant_service.generate_comprehensive_feedback(session_id),
                timeout=45.0  # Feedback generation might take longer
            )
        except asyncio.TimeoutError:
            logger.error(f"Timeout generating feedback: session={session_id}, operation={operation_id}")
            if enhanced_websocket_manager.is_connected(session_id):
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "error",
                    "data": {
                        "message": "Timeout generating presentation feedback",
                        "operation_id": operation_id,
                        "recoverable": True
                    }
                })

                # End processing state
                await enhanced_websocket_manager.send_json(session_id, {
                    "type": "control",
                    "data": {
                        "action": "stop",
                        "target": "processing",
                        "operation_id": operation_id
                    }
                })
            return

        # Send text response
        await enhanced_websocket_manager.send_json(session_id, {
            "type": "text",
            "data": {
                "text": feedback_text,
                "role": "assistant",
                "operation_id": operation_id,
                "context": "presentation_feedback"
            }
        })

        # Send audio response
        if audio_response and enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_bytes(session_id, audio_response)

        # Send processing end notification
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "stop",
                    "target": "processing",
                    "operation_id": operation_id
                }
            })

    except Exception as e:
        logger.error(f"Error generating feedback: session={session_id}, operation={operation_id}, error={str(e)}")
        if enhanced_websocket_manager.is_connected(session_id):
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "error",
                "data": {
                    "message": f"Error generating feedback: {str(e)}",
                    "operation_id": operation_id
                }
            })

            # End processing state
            await enhanced_websocket_manager.send_json(session_id, {
                "type": "control",
                "data": {
                    "action": "stop",
                    "target": "processing",
                    "operation_id": operation_id
                }
            })
