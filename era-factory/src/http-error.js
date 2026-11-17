// Error con código HTTP; lo usan las rutas y los servicios que ellas llaman.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
