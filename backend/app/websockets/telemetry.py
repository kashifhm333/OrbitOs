import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.simulation.engine import simulation_engine

router = APIRouter(tags=["WebSockets"])

async def _handle_simulation_websocket(websocket: WebSocket):
    await websocket.accept()
    queue = asyncio.Queue(maxsize=100)
    simulation_engine.register_listener(queue)
    
    try:
        # Send current simulation state immediately upon connection
        init_snapshot = simulation_engine.get_current_snapshot()
        await websocket.send_text(json.dumps(init_snapshot.model_dump(mode="json")))

        while True:
            # Wait for either incoming messages or next simulation tick in queue
            msg_task = asyncio.create_task(queue.get())
            rx_task = asyncio.create_task(websocket.receive_text())
            
            done, pending = await asyncio.wait(
                [msg_task, rx_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            for task in pending:
                task.cancel()
                
            if rx_task in done:
                try:
                    client_text = rx_task.result()
                except (WebSocketDisconnect, ConnectionResetError, RuntimeError):
                    break
                try:
                    payload = json.loads(client_text)
                    action = payload.get("action")
                    if action == "PING":
                        await websocket.send_text(json.dumps({"type": "PONG", "epoch": simulation_engine.current_epoch.isoformat()}))
                    elif action == "PLAY":
                        simulation_engine.start(payload.get("rate"))
                    elif action == "PAUSE":
                        simulation_engine.pause()
                    elif action == "STEP":
                        simulation_engine.pause()
                        snap = simulation_engine.step_tick()
                        await simulation_engine.broadcast_tick(snap)
                    elif action == "RESET":
                        simulation_engine.reset()
                except Exception:
                    pass

            if msg_task in done:
                try:
                    snapshot_data = msg_task.result()
                    await websocket.send_text(json.dumps(snapshot_data))
                except (WebSocketDisconnect, ConnectionResetError, RuntimeError):
                    break
                    
    except (WebSocketDisconnect, ConnectionResetError, RuntimeError, asyncio.CancelledError):
        pass
    finally:
        simulation_engine.unregister_listener(queue)


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await _handle_simulation_websocket(websocket)


@router.websocket("/ws/v1/simulation")
async def websocket_simulation_v1_endpoint(websocket: WebSocket):
    await _handle_simulation_websocket(websocket)

