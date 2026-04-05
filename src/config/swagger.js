'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zorvyn Finance API',
      version: '1.0.0',
      description:
        'Finance Data Processing and Access Control Backend — built with Node.js, Express.js & SQLite.',
      contact: {
        name: 'Zorvyn Backend Assignment',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Local Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide the JWT token obtained from POST /api/auth/login',
        },
      },
      schemas: {
        /* ── Shared ── */
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        /* ── Auth ── */
        RegisterRequest: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name:     { type: 'string', example: 'Jane Doe' },
            email:    { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', minLength: 8, example: 'Secret@123' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'admin@zorvyn.com' },
            password: { type: 'string', example: 'Admin@123' },
          },
        },
        /* ── User ── */
        User: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            name:       { type: 'string' },
            email:      { type: 'string' },
            role:       { type: 'string', enum: ['viewer', 'analyst', 'admin'] },
            status:     { type: 'string', enum: ['active', 'inactive'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        /* ── Financial Record ── */
        FinancialRecord: {
          type: 'object',
          properties: {
            id:         { type: 'integer' },
            amount:     { type: 'number', description: 'Amount in dollars', example: 1500.50 },
            type:       { type: 'string', enum: ['income', 'expense'] },
            category:   { type: 'string', example: 'Salary' },
            date:       { type: 'string', format: 'date', example: '2024-03-15' },
            notes:      { type: 'string', example: 'Monthly salary payment' },
            created_by: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        CreateRecordRequest: {
          type: 'object',
          required: ['amount', 'type', 'category', 'date'],
          properties: {
            amount:   { type: 'number', example: 1500.50 },
            type:     { type: 'string', enum: ['income', 'expense'] },
            category: { type: 'string', example: 'Salary' },
            date:     { type: 'string', format: 'date', example: '2024-03-15' },
            notes:    { type: 'string', example: 'Monthly salary payment' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
