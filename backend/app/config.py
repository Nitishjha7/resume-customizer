from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Read from environment / .env file
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # Upload limits
    max_file_size_mb: int = 5
    allowed_extensions: set[str] = {".pdf", ".docx"}

    # Who is allowed to call the API (the deployed Next.js frontend).
    # Comma separated list in the env, e.g. "https://my-app.vercel.app,http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
