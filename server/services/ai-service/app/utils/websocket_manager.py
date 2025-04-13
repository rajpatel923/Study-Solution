import logging
import asyncio
from typing import Dict, Any, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class WebSocketConnectionManager:
    """
    Enhanced WebSocket connection manager for handling multiple WebSocket connections
    with improved error handling and connection state verification
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_status: Dict[str, str] = {}  # 'connected', 'disconnecting', 'disconnected'
        self.session_data: Dict[str, Any] = {}
        self.pending_operations: Dict[str, Set[asyncio.Task]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """
        Connect a WebSocket client with improved handling

        Args:
            websocket (WebSocket): WebSocket connection
            session_id (str): Session identifier
        """
        try:
            await websocket.accept()

            async with self.lock:
                # If there was an existing connection, clean it up
                if session_id in self.active_connections:
                    try:
                        # Mark as disconnecting to prevent further sends
                        self.connection_status[session_id] = 'disconnecting'
                        old_websocket = self.active_connections[session_id]
                        await old_websocket.close(code=1001, reason="New connection established")
                    except Exception as e:
                        logger.warning(f"Error closing existing connection for {session_id}: {e}")

                self.active_connections[session_id] = websocket
                self.connection_status[session_id] = 'connected'

                if session_id not in self.session_data:
                    self.session_data[session_id] = {
                        "messages": []
                    }

                if session_id not in self.pending_operations:
                    self.pending_operations[session_id] = set()

            logger.info(f"WebSocket client connected: {session_id}")
        except Exception as e:
            logger.error(f"Error during WebSocket connection for {session_id}: {e}")
            raise

    async def disconnect(self, session_id: str) -> None:
        """
        Disconnect a WebSocket client and clean up resources

        Args:
            session_id (str): Session identifier
        """
        async with self.lock:
            if session_id in self.active_connections:
                # Prevent further sends
                self.connection_status[session_id] = 'disconnecting'

                try:
                    # Try to close the connection gracefully
                    await self.active_connections[session_id].close(code=1000)
                except Exception as e:
                    logger.warning(f"Error closing WebSocket for {session_id}: {e}")

                # Remove the connection
                del self.active_connections[session_id]
                self.connection_status[session_id] = 'disconnected'
                logger.info(f"WebSocket client disconnected: {session_id}")

                # Cancel any pending tasks for this session
                if session_id in self.pending_operations:
                    for task in self.pending_operations[session_id]:
                        if not task.done():
                            try:
                                task.cancel()
                            except Exception as e:
                                logger.warning(f"Error cancelling task for {session_id}: {e}")
                    self.pending_operations[session_id].clear()

    def is_connected(self, session_id: str) -> bool:
        """
        Check if a session is currently connected

        Args:
            session_id (str): Session identifier

        Returns:
            bool: True if connected, False otherwise
        """
        return (session_id in self.active_connections and
                self.connection_status.get(session_id) == 'connected')

    async def send_text(self, session_id: str, message: str) -> bool:
        """
        Send a text message to a WebSocket client with improved error handling

        Args:
            session_id (str): Session identifier
            message (str): Message to send

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Attempt to send text to disconnected session: {session_id}")
            return False

        try:
            await self.active_connections[session_id].send_text(message)
            return True
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected while sending text to {session_id}")
            await self.disconnect(session_id)
            return False
        except Exception as e:
            logger.error(f"Error sending text to {session_id}: {e}")
            if "websocket.close" in str(e) or "disconnect message" in str(e):
                # Connection is already closed, mark as disconnected
                self.connection_status[session_id] = 'disconnected'
                if session_id in self.active_connections:
                    del self.active_connections[session_id]
            return False

    async def send_bytes(self, session_id: str, data: bytes) -> bool:
        """
        Send binary data to a WebSocket client with improved error handling

        Args:
            session_id (str): Session identifier
            data (bytes): Binary data to send

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Attempt to send bytes to disconnected session: {session_id}")
            return False

        try:
            # Break large binary transfers into chunks to prevent blocking
            chunk_size = 1024 * 64  # 64KB chunks
            if len(data) > chunk_size * 2:  # Only chunk if significantly large
                for i in range(0, len(data), chunk_size):
                    # Check connection status before each chunk
                    if not self.is_connected(session_id):
                        logger.warning(f"Connection lost during chunked transfer for {session_id}")
                        return False

                    chunk = data[i:i + chunk_size]
                    await self.active_connections[session_id].send_bytes(chunk)
                    # Small yield to allow other tasks to run
                    await asyncio.sleep(0.001)
                return True
            else:
                await self.active_connections[session_id].send_bytes(data)
                return True
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected while sending bytes to {session_id}")
            await self.disconnect(session_id)
            return False
        except Exception as e:
            logger.error(f"Error sending bytes to {session_id}: {e}")
            if "websocket.close" in str(e) or "disconnect message" in str(e):
                # Connection is already closed, mark as disconnected
                self.connection_status[session_id] = 'disconnected'
                if session_id in self.active_connections:
                    del self.active_connections[session_id]
            return False

    async def send_json(self, session_id: str, data: dict) -> bool:
        """
        Send JSON data to a WebSocket client with improved error handling

        Args:
            session_id (str): Session identifier
            data (dict): JSON data to send

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Attempt to send JSON to disconnected session: {session_id}")
            return False

        try:
            await self.active_connections[session_id].send_json(data)
            return True
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected while sending JSON to {session_id}")
            await self.disconnect(session_id)
            return False
        except Exception as e:
            logger.error(f"Error sending JSON to {session_id}: {e}")
            if "websocket.close" in str(e) or "disconnect message" in str(e):
                # Connection is already closed, mark as disconnected
                self.connection_status[session_id] = 'disconnected'
                if session_id in self.active_connections:
                    del self.active_connections[session_id]
            return False

    async def broadcast(self, message: str) -> None:
        """
        Broadcast a message to all connected clients safely

        Args:
            message (str): Message to broadcast
        """
        disconnected_sessions = []

        # Get a copy of the session IDs to avoid modification during iteration
        session_ids = list(self.active_connections.keys())

        for session_id in session_ids:
            try:
                if not await self.send_text(session_id, message):
                    disconnected_sessions.append(session_id)
            except Exception:
                disconnected_sessions.append(session_id)

        # Clean up disconnected sessions
        for session_id in disconnected_sessions:
            await self.disconnect(session_id)

    async def broadcast_json(self, data: dict) -> None:
        """
        Broadcast JSON data to all connected clients safely

        Args:
            data (dict): JSON data to broadcast
        """
        disconnected_sessions = []

        # Get a copy of the session IDs to avoid modification during iteration
        session_ids = list(self.active_connections.keys())

        for session_id in session_ids:
            try:
                if not await self.send_json(session_id, data):
                    disconnected_sessions.append(session_id)
            except Exception:
                disconnected_sessions.append(session_id)

        # Clean up disconnected sessions
        for session_id in disconnected_sessions:
            await self.disconnect(session_id)

    def create_task(self, session_id: str, coro) -> asyncio.Task:
        """
        Create and track an asyncio task for a specific session

        Args:
            session_id (str): Session identifier
            coro: Coroutine to run as a task

        Returns:
            asyncio.Task: The created task
        """

        # Wrap the coroutine in an exception handler
        async def _wrapped_coro():
            try:
                return await coro
            except asyncio.CancelledError:
                # This is normal during cleanup, just propagate
                raise
            except Exception as e:
                logger.error(f"Unhandled exception in task for session {session_id}: {str(e)}")
                # Don't let exceptions in tasks break the WebSocket connection
                return None

        task = asyncio.create_task(_wrapped_coro())

        if session_id in self.pending_operations:
            self.pending_operations[session_id].add(task)

            # Add a callback to remove the task from tracking when done
            def _on_task_done(t):
                if session_id in self.pending_operations and t in self.pending_operations[session_id]:
                    self.pending_operations[session_id].remove(t)
                    # Log completion for debugging
                    try:
                        exception = t.exception()
                        if exception:
                            logger.warning(f"Task for session {session_id} completed with exception: {str(exception)}")
                    except asyncio.CancelledError:
                        # Task was cancelled, which is normal during cleanup
                        pass
                    except Exception:
                        # Task completed normally
                        pass

            task.add_done_callback(_on_task_done)

        return task


# Create a singleton instance
websocket_manager = WebSocketConnectionManager()