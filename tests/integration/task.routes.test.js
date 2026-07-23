const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');

// Setup: Initialize database before tests
beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

// Cleanup: Close connection after tests
afterAll(async () => {
  await db.sequelize.close();
});

describe('Task Routes Integration Tests', () => {
  describe('GET /api/tasks', () => {
    test('should return empty array initially', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/tasks', () => {
    test('should create a new task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          nom: 'Intégration test task',
          description: 'Une tâche créée via les tests d\'intégration',
          statut: 'à faire'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nom).toBe('Intégration test task');
      expect(response.body.description).toBe('Une tâche créée via les tests d\'intégration');
      expect(response.body.statut).toBe('à faire');
    });

    test('should return 400 if nom is missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          description: 'Tâche sans nom',
          statut: 'à faire'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      // Create a task for testing
      const response = await request(app)
        .post('/api/tasks')
        .send({
          nom: 'Task to retrieve',
          description: 'Description',
          statut: 'en cours'
        });
      taskId = response.body.id;
    });

    test('should retrieve a task by ID', async () => {
      const response = await request(app).get(`/api/tasks/${taskId}`);
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(taskId);
      expect(response.body.nom).toBe('Task to retrieve');
    });

    test('should return 404 for non-existent task', async () => {
      const response = await request(app).get('/api/tasks/9999');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          nom: 'Task to update',
          description: 'Original description',
          statut: 'à faire'
        });
      taskId = response.body.id;
    });

    test('should update a task', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .send({
          nom: 'Updated task',
          statut: 'terminée'
        });

      expect(response.status).toBe(200);
      expect(response.body.nom).toBe('Updated task');
      expect(response.body.statut).toBe('terminée');
    });

    test('should return 404 when updating non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/9999')
        .send({
          nom: 'Updated',
          statut: 'en cours'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          nom: 'Task to delete',
          description: 'Will be deleted',
          statut: 'à faire'
        });
      taskId = response.body.id;
    });

    test('should delete a task', async () => {
      const response = await request(app).delete(`/api/tasks/${taskId}`);
      expect(response.status).toBe(200);

      // Verify task is deleted
      const getResponse = await request(app).get(`/api/tasks/${taskId}`);
      expect(getResponse.status).toBe(404);
    });

    test('should return 404 when deleting non-existent task', async () => {
      const response = await request(app).delete('/api/tasks/9999');
      expect(response.status).toBe(404);
    });
  });

  describe('Root endpoint', () => {
    test('should return API status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('OK');
    });
  });
});

