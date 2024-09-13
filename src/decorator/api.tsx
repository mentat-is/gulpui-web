export function _server(useNumeric?: boolean) {
  return process.env.NODE_ENV === 'production'
    ? process.env.PRODUCTION_HOST || 'https://admin.mentat.is'
    : useNumeric
      ? process.env.NUMERIC_HOST || 'http://0.0.0.0:3001'
      : process.env.SYMBOLIC_HOST || 'http://localhost:8080'
}
