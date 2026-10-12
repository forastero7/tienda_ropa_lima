process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://tienda:tienda@localhost:5432/tienda_test";
process.env.ADMIN_SESSION_SECRET = "test-secret-test-secret-test-secret-test";
process.env.PAYMENTS_SANDBOX_ENABLED = "true";
process.env.PAYMENTS_SANDBOX_SECRET = "test-sandbox";
process.env.BANK_TRANSFER_INSTRUCTIONS = "Cuenta de prueba";
process.env.YAPE_PLIN_PHONE = "900000000";
