from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/novalwriter"
    database_url_sync: str = "postgresql://postgres:postgres@localhost:5432/novalwriter"
    secret_key: str = "dev-secret-key-change-in-production"
    llm_provider: str = "mock"
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    qwen_api_key: str = ""
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    wenxin_api_key: str = ""
    wenxin_secret_key: str = ""
    chapter_storage_path: str = "./projects"

    model_config = {"env_file": ".env"}


settings = Settings()
