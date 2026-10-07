"""Domain errors raised by services; the API layer maps them to HTTP responses."""


class ServiceError(Exception):
    status_code = 400

    def __init__(self, detail: str) -> None:
        super().__init__(detail)
        self.detail = detail


class BadRequestError(ServiceError):
    status_code = 400


class NotFoundError(ServiceError):
    status_code = 404


class ConflictError(ServiceError):
    status_code = 409


class UnprocessableError(ServiceError):
    status_code = 422
