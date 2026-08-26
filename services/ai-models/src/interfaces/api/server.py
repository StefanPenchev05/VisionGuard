import uvicorn


def main() -> None:
    uvicorn.run(
        "interfaces.api.app:app",
        host="127.0.0.1",
        port=8765,
        reload=True,
    )


if __name__ == "__main__":
    main()
