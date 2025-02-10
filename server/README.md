# Study Sync - Backend Architecture

## 📖 Overview

Study Sync is an **AI-powered** web application designed to assist students with their academic tasks. This backend architecture is built using:

- **Spring Boot Microservices** for scalable backend operations.
- **Python + LangChain** for AI-driven features.
- **Next.js** for the frontend.

---

## 🏗 **Architecture Overview**

### **1. System Architecture**

The backend follows a **Microservices Architecture** with:

- **Spring Cloud Gateway** for API routing & security.
- **Spring Boot Microservices** for authentication, study materials, quizzes, and analytics.
- **Python + LangChain** for AI-powered learning features.
- **PostgreSQL, MongoDB, and Pinecone** for data storage.

### **2. Architecture Diagram**

```plaintext
                           +---------------------------+
                           |        Next.js (UI)       |
                           +---------------------------+
                                    |
                                    ▼
                +--------------------------------------+
                |          API Gateway (Spring)       |
                | (Routing, Auth, Rate Limiting, Logs)|
                +--------------------------------------+
                                    |
    ------------------------------------------------------------------
    |                |                    |                 |
+--------+       +---------+        +-----------+      +------------+
|  Auth  |       |  User   |        |  Study    |      |   Quiz     |
| Service|       | Service |        |  Material |      |  Service   |
| (JWT)  |       |         |        |  Service  |      |            |
+--------+       +---------+        +-----------+      +------------+
                                    |
                           +-------------------+
                           | AI Service (LangChain) |
                           +-------------------+
                                    |
                        +----------------------------+
                        | Vector Database (Embeddings) |
                        +----------------------------+
```
