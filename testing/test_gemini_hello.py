import asyncio

from backend.gemini_client import call_gemini


async def main() -> None:
    try:
        result = await call_gemini("You are a helpful assistant.", "Say hello in Malay")
        print("Gemini response:")
        print(result)
    except Exception as exc:
        print(f"Gemini test failed: {type(exc).__name__}: {exc}")


if __name__ == "__main__":
    asyncio.run(main())
