import asyncio

from backend.orchestrator import run_pipeline


class MockSio:
    async def emit(self, event, data, to=None):
        print(f"EMIT [{event}]: {data}")


async def test():
    result = await run_pipeline(
        "Nak buat team building 80 orang next Friday budget RM4000 outdoor KL",
        MockSio(),
        "test_socket",
    )
    print("Done:", result)


asyncio.run(test())
