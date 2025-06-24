import json
import logging
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from fastapi import WebSocket, WebSocketDisconnect

# Initialize logger
logger = logging.getLogger(__name__)


class EnhancedWebSocketManager:
    """
    Enhanced WebSocket manager with improved reliability, message tracking and state recovery
    """

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_status: Dict[str, str] = {}  # 'connected', 'disconnecting', 'disconnected'
        self.session_tasks: Dict[str, Dict[str, asyncio.Task]] = {}  # Track tasks by session and message ID
        self.message_tracking: Dict[str, Dict[str, Dict[str, Any]]] = {}  # Track message status
        self.lock = asyncio.Lock()
        self.send_lock = asyncio.Lock()

        # Initialize recovery cache
        self.message_cache: Dict[str, List[Dict[str, Any]]] = {}  # Last N messages for recovery
        self.max_cached_messages = 20  # Maximum number of messages to cache per session

    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """
        Establish WebSocket connection with improved handling

        Args:
            websocket: WebSocket connection
            session_id: Session identifier
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

                # Initialize session data
                self.active_connections[session_id] = websocket
                self.connection_status[session_id] = 'connected'

                # Initialize tracking structures if needed
                if session_id not in self.session_tasks:
                    self.session_tasks[session_id] = {}

                if session_id not in self.message_tracking:
                    self.message_tracking[session_id] = {}

                # Initialize message cache if needed
                if session_id not in self.message_cache:
                    self.message_cache[session_id] = []

            logger.info(f"WebSocket client connected: {session_id}")

            # Send connection confirmation with session state
            await self.send_json(session_id, {
                "type": "connection_status",
                "data": {
                    "status": "connected",
                    "message": "WebSocket connection established",
                    "timestamp": datetime.now().isoformat(),
                    "session_id": session_id,
                    "cached_messages": len(self.message_cache.get(session_id, []))
                }
            })

        except Exception as e:
            logger.error(f"Error during WebSocket connection for {session_id}: {e}")
            raise

    async def disconnect(self, session_id: str) -> None:
        """
        Disconnect a WebSocket client with proper cleanup

        Args:
            session_id: Session identifier
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

                # Cancel any running tasks for this session
                if session_id in self.session_tasks:
                    for message_id, task in list(self.session_tasks[session_id].items()):
                        if not task.done():
                            try:
                                task.cancel()
                                logger.info(f"Cancelled task for message {message_id} in session {session_id}")
                            except Exception as e:
                                logger.warning(f"Error cancelling task for message {message_id}: {e}")

                    # Clear task dictionary
                    self.session_tasks[session_id].clear()

    def is_connected(self, session_id: str) -> bool:
        """
        Check if a session is connected

        Args:
            session_id: Session identifier

        Returns:
            bool: Connection status
        """
        return (session_id in self.active_connections and
                self.connection_status.get(session_id) == 'connected')

    async def send_json(self, session_id: str, data: Dict[str, Any]) -> bool:
        """
        Send JSON data with tracking and caching

        Args:
            session_id: Session identifier
            data: JSON data to send

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Attempt to send JSON to disconnected session: {session_id}")
            return False

        try:
            # Add message ID if not present
            if 'message_id' not in data:
                message_id = str(uuid.uuid4())
                data['message_id'] = message_id
            else:
                message_id = data['message_id']

            # Add timestamp if not present
            if 'timestamp' not in data:
                data['timestamp'] = datetime.now().isoformat()

            # Cache the message for recovery
            await self._cache_message(session_id, data, binary=False)

            # Track message status
            self.message_tracking[session_id][message_id] = {
                'type': 'json',
                'timestamp': datetime.now().isoformat(),
                'status': 'sending'
            }

            # Send the message
            await self.active_connections[session_id].send_json(data)

            # Update message status
            self.message_tracking[session_id][message_id]['status'] = 'sent'

            return True
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected while sending JSON to {session_id}")
            await self.disconnect(session_id)
            return False
        except Exception as e:
            logger.error(f"Error sending JSON to {session_id}: {e}")

            # Update message status
            if message_id in self.message_tracking.get(session_id, {}):
                self.message_tracking[session_id][message_id]['status'] = 'failed'
                self.message_tracking[session_id][message_id]['error'] = str(e)

            # Handle disconnect cases
            if "websocket.close" in str(e) or "disconnect message" in str(e):
                # Connection is already closed, mark as disconnected
                self.connection_status[session_id] = 'disconnected'
                if session_id in self.active_connections:
                    del self.active_connections[session_id]

            return False

    async def send_bytes(self, session_id: str, data: bytes) -> bool:
        """
        Send binary data with chunking for large payloads

        Args:
            session_id: Session identifier
            data: Binary data to send

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Attempt to send bytes to disconnected session: {session_id}")
            return False

        try:
            # Generate message ID for tracking
            message_id = str(uuid.uuid4())

            # Track message status
            self.message_tracking[session_id][message_id] = {
                'type': 'binary',
                'size': len(data),
                'timestamp': datetime.now().isoformat(),
                'status': 'sending'
            }

            # Cache message metadata (not the binary data itself)
            await self._cache_message(session_id, {
                'message_id': message_id,
                'type': 'binary_metadata',
                'size': len(data),
                'timestamp': datetime.now().isoformat()
            }, binary=False)

            # Break large binary transfers into chunks to prevent blocking
            chunk_size = 1024 * 64  # 64KB chunks
            if len(data) > chunk_size * 2:  # Only chunk if significantly large
                # Send header message with total size
                await self.send_json(session_id, {
                    'type': 'binary_start',
                    'message_id': message_id,
                    'data': {
                        'total_size': len(data),
                        'chunk_size': chunk_size,
                        'total_chunks': (len(data) + chunk_size - 1) // chunk_size
                    }
                })

                for i in range(0, len(data), chunk_size):
                    # Check connection status before each chunk
                    if not self.is_connected(session_id):
                        logger.warning(f"Connection lost during chunked transfer for {session_id}")
                        return False

                    chunk = data[i:i + chunk_size]
                    await self.active_connections[session_id].send_bytes(chunk)

                    # Small yield to allow other tasks to run
                    await asyncio.sleep(0.001)

                # Send completion message
                await self.send_json(session_id, {
                    'type': 'binary_complete',
                    'message_id': message_id
                })

                # Update message status
                self.message_tracking[session_id][message_id]['status'] = 'sent'
                return True
            else:
                # Send small binary directly
                await self.active_connections[session_id].send_bytes(data)

                # Update message status
                self.message_tracking[session_id][message_id]['status'] = 'sent'
                return True

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected while sending bytes to {session_id}")
            await self.disconnect(session_id)
            return False
        except Exception as e:
            logger.error(f"Error sending bytes to {session_id}: {e}")

            # Update message status
            if message_id in self.message_tracking.get(session_id, {}):
                self.message_tracking[session_id][message_id]['status'] = 'failed'
                self.message_tracking[session_id][message_id]['error'] = str(e)

            if "websocket.close" in str(e) or "disconnect message" in str(e):
                # Connection is already closed, mark as disconnected
                self.connection_status[session_id] = 'disconnected'
                if session_id in self.active_connections:
                    del self.active_connections[session_id]

            return False

    async def _cache_message(self, session_id: str, data: Dict[str, Any], binary: bool = False) -> None:
        """
        Cache a message for potential recovery

        Args:
            session_id: Session identifier
            data: Message data to cache
            binary: Whether this is binary data (only metadata cached)
        """
        if session_id not in self.message_cache:
            self.message_cache[session_id] = []

        # Add to cache
        self.message_cache[session_id].append({
            'timestamp': datetime.now().isoformat(),
            'data': data,
            'binary': binary
        })

        # Trim cache if needed
        if len(self.message_cache[session_id]) > self.max_cached_messages:
            # Remove oldest messages
            self.message_cache[session_id] = self.message_cache[session_id][-self.max_cached_messages:]

    async def recover_session(self, session_id: str, last_message_id: Optional[str] = None) -> bool:
        """
        Attempt to recover session by resending cached messages

        Args:
            session_id: Session identifier
            last_message_id: Last message ID received by client

        Returns:
            bool: Success status
        """
        if not self.is_connected(session_id):
            logger.warning(f"Cannot recover disconnected session: {session_id}")
            return False

        if session_id not in self.message_cache or not self.message_cache[session_id]:
            logger.info(f"No cached messages to recover for session {session_id}")
            return False

        try:
            # Find position of last received message
            start_idx = 0
            if last_message_id:
                for i, cached_msg in enumerate(self.message_cache[session_id]):
                    if cached_msg['data'].get('message_id') == last_message_id:
                        start_idx = i + 1
                        break

            # No newer messages available
            if start_idx >= len(self.message_cache[session_id]):
                logger.info(f"No new messages to recover for session {session_id}")
                return True

            # Send recovery start notification
            await self.send_json(session_id, {
                'type': 'recovery_start',
                'data': {
                    'message_count': len(self.message_cache[session_id]) - start_idx
                }
            })

            # Resend cached messages
            for i in range(start_idx, len(self.message_cache[session_id])):
                cached_msg = self.message_cache[session_id][i]

                # Skip binary messages (can't recover these)
                if cached_msg['binary']:
                    continue

                # Mark as recovery message
                if 'data' in cached_msg and isinstance(cached_msg['data'], dict):
                    cached_msg['data']['is_recovery'] = True

                    # Send message
                    await self.send_json(session_id, cached_msg['data'])

                    # Small delay to avoid overwhelming the client
                    await asyncio.sleep(0.01)

            # Send recovery complete notification
            await self.send_json(session_id, {
                'type': 'recovery_complete',
                'data': {
                    'message_count': len(self.message_cache[session_id]) - start_idx
                }
            })

            return True

        except Exception as e:
            logger.error(f"Error recovering session {session_id}: {e}")
            return False

    def create_task(self, session_id: str, coro, message_id: Optional[str] = None) -> asyncio.Task:
        """
        Create and track an asyncio task for a specific session and message

        Args:
            session_id: Session identifier
            coro: Coroutine to run as a task
            message_id: Optional message ID to associate with task

        Returns:
            asyncio.Task: Created task
        """
        if not message_id:
            message_id = str(uuid.uuid4())

        # Initialize tracking structures if needed
        if session_id not in self.session_tasks:
            self.session_tasks[session_id] = {}

        if session_id not in self.message_tracking:
            self.message_tracking[session_id] = {}

        # Wrap the coroutine in an exception handler
        async def _wrapped_coro():
            try:
                # Track task status
                self.message_tracking[session_id][message_id] = {
                    'type': 'task',
                    'timestamp': datetime.now().isoformat(),
                    'status': 'running'
                }

                # Run the actual coroutine
                result = await coro

                # Update task status
                self.message_tracking[session_id][message_id]['status'] = 'completed'
                self.message_tracking[session_id][message_id]['completed_at'] = datetime.now().isoformat()

                return result

            except asyncio.CancelledError:
                # This is normal during cleanup, update status and propagate
                self.message_tracking[session_id][message_id]['status'] = 'cancelled'
                self.message_tracking[session_id][message_id]['cancelled_at'] = datetime.now().isoformat()
                raise

            except Exception as e:
                # Log the exception and update status
                logger.error(f"Unhandled exception in task for message {message_id} in session {session_id}: {str(e)}")
                self.message_tracking[session_id][message_id]['status'] = 'failed'
                self.message_tracking[session_id][message_id]['error'] = str(e)
                self.message_tracking[session_id][message_id]['failed_at'] = datetime.now().isoformat()

                # Don't let exceptions in tasks break the WebSocket connection
                return None

        # Create and store the task
        task = asyncio.create_task(_wrapped_coro())
        self.session_tasks[session_id][message_id] = task

        # Add a callback to clean up the task when done
        def _on_task_done(t):
            try:
                # Remove task from tracking when done
                if session_id in self.session_tasks and message_id in self.session_tasks[session_id]:
                    del self.session_tasks[session_id][message_id]
            except Exception as e:
                logger.error(f"Error in task cleanup for {message_id}: {e}")

        task.add_done_callback(_on_task_done)

        return task

    async def broadcast(self, message: str, exclude_session_ids: List[str] = None) -> None:
        """
        Broadcast a text message to all connected clients

        Args:
            message: Message to broadcast
            exclude_session_ids: List of session IDs to exclude
        """
        exclude_session_ids = exclude_session_ids or []
        disconnected_sessions = []

        # Get a copy of the session IDs to avoid modification during iteration
        session_ids = list(self.active_connections.keys())

        for session_id in session_ids:
            # Skip excluded sessions
            if session_id in exclude_session_ids:
                continue

            try:
                if not await self.send_json(session_id, {
                    'type': 'broadcast',
                    'data': {'message': message}
                }):
                    disconnected_sessions.append(session_id)
            except Exception:
                disconnected_sessions.append(session_id)

        # Clean up disconnected sessions
        for session_id in disconnected_sessions:
            await self.disconnect(session_id)

    async def broadcast_json(self, data: Dict[str, Any], exclude_session_ids: List[str] = None) -> None:
        """
        Broadcast JSON data to all connected clients

        Args:
            data: JSON data to broadcast
            exclude_session_ids: List of session IDs to exclude
        """
        exclude_session_ids = exclude_session_ids or []
        disconnected_sessions = []

        # Get a copy of the session IDs to avoid modification during iteration
        session_ids = list(self.active_connections.keys())

        for session_id in session_ids:
            # Skip excluded sessions
            if session_id in exclude_session_ids:
                continue

            try:
                if not await self.send_json(session_id, {
                    'type': 'broadcast',
                    'data': data
                }):
                    disconnected_sessions.append(session_id)
            except Exception:
                disconnected_sessions.append(session_id)

        # Clean up disconnected sessions
        for session_id in disconnected_sessions:
            await self.disconnect(session_id)

    def debug_connection_status(self, session_id: str) -> Dict[str, Any]:
        """
        Get detailed connection status for debugging

        Args:
            session_id: Session identifier

        Returns:
            Dict[str, Any]: Detailed connection status
        """
        is_connected = self.is_connected(session_id)
        status = self.connection_status.get(session_id, 'unknown')
        has_websocket = session_id in self.active_connections
        tasks_count = len(self.session_tasks.get(session_id, {}))
        message_tracking_count = len(self.message_tracking.get(session_id, {}))
        cached_messages = len(self.message_cache.get(session_id, []))

        logger.info(f"DEBUG: Connection status for {session_id}: {status}, connected={is_connected}")
        logger.info(
            f"DEBUG: Has websocket: {has_websocket}, tasks: {tasks_count}, messages tracked: {message_tracking_count}")

        return {
            "is_connected": is_connected,
            "status": status,
            "has_websocket": has_websocket,
            "tasks_count": tasks_count,
            "message_tracking_count": message_tracking_count,
            "cached_messages": cached_messages
        }

    async def debug_connect(self, websocket: WebSocket, session_id: str) -> None:
        """
        Enhanced connect method with more detailed debugging

        Args:
            websocket: WebSocket connection
            session_id: Session identifier
        """
        try:
            logger.info(f"DEBUG: Attempting to connect websocket for session {session_id}")

            # Log WebSocket client headers and query params
            client_headers = getattr(websocket, 'headers', {})
            client_query = getattr(websocket, 'query_params', {})
            logger.info(f"DEBUG: Client headers: {client_headers}")
            logger.info(f"DEBUG: Client query params: {client_query}")

            # Try to accept the WebSocket connection
            logger.info(f"DEBUG: Calling websocket.accept() for session {session_id}")
            await websocket.accept()
            logger.info(f"DEBUG: Successfully called websocket.accept() for session {session_id}")

            async with self.lock:
                # If there was an existing connection, clean it up
                if session_id in self.active_connections:
                    try:
                        # Mark as disconnecting to prevent further sends
                        old_status = self.connection_status.get(session_id, 'unknown')
                        logger.info(f"DEBUG: Existing connection found for {session_id}, status: {old_status}")

                        self.connection_status[session_id] = 'disconnecting'
                        old_websocket = self.active_connections[session_id]

                        logger.info(f"DEBUG: Attempting to close existing connection for {session_id}")
                        await old_websocket.close(code=1001, reason="New connection established")
                        logger.info(f"DEBUG: Successfully closed existing connection for {session_id}")
                    except Exception as e:
                        logger.warning(f"DEBUG: Error closing existing connection for {session_id}: {e}")

                # Initialize session data
                self.active_connections[session_id] = websocket
                self.connection_status[session_id] = 'connected'
                logger.info(f"DEBUG: Set connection status to 'connected' for {session_id}")

                # Initialize tracking structures if needed
                if session_id not in self.session_tasks:
                    self.session_tasks[session_id] = {}
                    logger.info(f"DEBUG: Initialized session_tasks for {session_id}")

                if session_id not in self.message_tracking:
                    self.message_tracking[session_id] = {}
                    logger.info(f"DEBUG: Initialized message_tracking for {session_id}")

                # Initialize message cache if needed
                if session_id not in self.message_cache:
                    self.message_cache[session_id] = []
                    logger.info(f"DEBUG: Initialized message_cache for {session_id}")

            logger.info(f"DEBUG: WebSocket client connected: {session_id}")

            # Send connection confirmation with session state
            try:
                logger.info(f"DEBUG: Attempting to send connection confirmation to {session_id}")
                await self.send_json(session_id, {
                    "type": "connection_status",
                    "data": {
                        "status": "connected",
                        "message": "WebSocket connection established",
                        "timestamp": datetime.now().isoformat(),
                        "session_id": session_id,
                        "cached_messages": len(self.message_cache.get(session_id, []))
                    }
                })
                logger.info(f"DEBUG: Successfully sent connection confirmation to {session_id}")
            except Exception as e:
                logger.error(f"DEBUG: Error sending connection confirmation to {session_id}: {e}")
                # This is non-fatal

        except Exception as e:
            logger.error(f"DEBUG: Error during WebSocket connection for {session_id}: {e}")
            import traceback
            logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")

            # Try to send error to client
            try:
                await websocket.send_json({
                    "type": "error",
                    "data": {
                        "message": f"Error establishing connection: {str(e)}"
                    }
                })
            except Exception as send_error:
                logger.error(f"DEBUG: Failed to send error message to client: {send_error}")

            # Try to close WebSocket
            try:
                await websocket.close(code=1011, reason=f"Connection error: {str(e)}")
            except Exception as close_error:
                logger.error(f"DEBUG: Failed to close WebSocket after error: {close_error}")

            raise


# Create a singleton instance
enhanced_websocket_manager = EnhancedWebSocketManager()