/**
 * Test Setup - In-memory MongoDB for testing
 * Used as setupFilesAfterFramework via Jest
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

global.beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key-2024';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-2024';
  process.env.CERT_SIGNING_SECRET = 'test-cert-signing-2024';
  
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }
});

global.afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

global.afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
