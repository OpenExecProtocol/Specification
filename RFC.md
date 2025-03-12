# RFC: Open Tool Calling Standard

**Status:** Draft

## Abstract

This document specifies the Open Tool Calling (OTC) standard, a comprehensive communication protocol for AI agents (clients) calling tools. It defines the structures and protocols used to describe tools, initiate tool calls, and process responses. The standard is comprised of JSON and OpenAPI schemas that govern tool definitions, tool requests, and tool responses. It aims to provide a unified, extensible, and interoperable framework for client-to-tool interactions.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14) [[RFC2119]](https://datatracker.ietf.org/doc/html/rfc2119) [[RFC8174]](https://datatracker.ietf.org/doc/html/rfc8174) when, and only when, they appear in all capitals, as shown here.

## Editors

- Nate Barbettini ([@nbarbettini](https://github.com/nbarbettini))
- Eugene Yurtsev ([@eyurtsev](https://github.com/eyurtsev))
- Sam Partee ([@spartee](https://github.com/spartee))

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Architecture Overview](#3-architecture-overview)
4. [Schema Definitions](#4-schema-definitions)
   - [Tool Definition Schema](#41-tool-definition-schema)
   - [Tool Request Schema](#42-tool-request-schema)
   - [Tool Response Schema](#43-tool-response-schema)
5. [Communication Flows](#5-communication-flows)
6. [Security and Authorization](#6-security-and-authorization)
7. [Extensibility and Versioning](#7-extensibility-and-versioning)
8. [Conclusion](#8-conclusion)
9. [References](#9-references)

---

## 1. Introduction

The Open Tool Calling standard establishes a set of protocols and formats to facilitate communication between agents (clients) and tools (functions or services) in distributed systems. It ensures that tool definitions, requests, and responses adhere to a structured and open standard. This specification presents detailed JSON and OpenAPI schemas that serve as the backbone for this standard, enabling uniform interpretation and execution of tool interactions.

## 2. Terminology

- **Client:** An entity that issues requests to tools for performing specific tasks.
- **Server** (or Tool Server): An entity that hosts a collection of tools and processes tool calls.
- **Tool:** A service or function that can be executed (called) by a client using the defined protocols.

## 3. Architecture Overview

The Open Tool Calling standard is designed around three key components:

1. **Tool Definition:** A schema that specifies how a tool is described. It includes metadata such as the tool's name, unique identifier, and the input/output specifications.
2. **Tool Request:** A schema that details the structure of a tool call. It encompasses the call identifier, execution context, tool metadata, and input parameters.
3. **Tool Response:** A schema that outlines the structure of the response returned from a tool call. It provides details on execution status, duration, and the actual output (or errors) of the tool call.

These components ensure consistent communication between clients and tools, regardless of the implementation details of each tool.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Tool Server
    participant T as Tool

    ## Health check
    C->>S: Request health check
    S->>C: Health check response

    %% Tool discovery
    C->>S: Request tool list
    S->>C: List of available tools

    %% Tool call
    C->>S: Send call request
    Note left of C: Resolve requirements (such as authorization)
    S->>T: Run tool (function)
    T->>S: Return tool response
    S->>C: Return tool response

```

## 4. Schema Definitions

### 4.1 Tool Definition Schema

The Tool Definition Schema establishes the properties and required fields to describe a tool. It consists of the following sections:

#### Metadata

- **`id`** (required): A unique identifier for the tool, in the following format: `ToolkitName.ToolName@Version`. For example, `Calculator.Add@1.0.0`. The `id` MUST be unique within the scope of the Tool Server.
- **`name`** (required): A human-readable name for the tool. For example, `Add` or `Calculator_Add`. The name MUST contain only alphanumeric characters, underscores, and dashes, and be between 1 and 64 characters in length.
- **`description`** (required): A human-readable explanation of the tool's purpose. This field SHOULD be used by both humans and AI models.
- **`version`** (required): The semantic version of the tool, e.g. `1.0.0`. Multiple versions of the same tool MAY exist.

#### Input Schema

**`input_schema`** (required): Describes the input parameters for the tool.

- **`parameters`** (required): A JSON Schema object that describes the input parameters for the tool. This schema supports standard JSON Schema validation but excludes `$ref` and nested definitions/schemas for simplicity. The `parameters` field MUST be present, but MAY be an empty object.

If present, each parameter in `parameters` MUST be a valid JSON Schema object and MUST contain a `description` field describing the parameter.

#### Output Schema

**`output_schema`** (required): A JSON Schema object that describes the output parameters for the tool. `output_schema` MAY be an empty object indicating that the tool can return an unconstrained ("any") JSON value, and MAY be `null` indicating that the tool does not return any output.

#### Requirements

**`requirements`** (optional): Describes tool requirements that are not strictly input parameters, such as an API key needed to call a target API, or that a tool requires OAuth 2.0-based authorization.

If the `requirements` field is not present, the server MUST allow the tool to be executed without passing any additional information.

If the `requirements` field and one or more sub-fields are present, the client MUST pass the required information in the `context` field of the `CallToolRequest` schema.

**`requirements.authorization`** (optional): Declares one or more required authorization methods.

Each authorization method is described as an object with the following properties:

- **`id`**: A unique identifier for the authorization method or authorization provider.
- **`oauth2`** (optional): For tools that require OAuth 2.0-based authorization, this field contains the OAuth 2.0-specific authorization details.
  - **`scopes`**: A list of scopes that must be granted for the tool to execute properly.

**`requirements.secrets`** (optional): Declares one or more secrets that are required for the tool to execute.

Each required secret is described as an object with the following properties:

- **`id`**: A unique identifier for the secret.

#### Non-Normative Examples

1. **Calculator.Add**

   A tool that adds two numbers.

   ```json
   {
     "id": "Calculator.Add@1.0.0",
     "name": "Calculator_Add",
     "description": "Adds two numbers together.",
     "version": "1.0.0",
     "input_schema": {
       "parameters": {
         "type": "object",
         "properties": {
           "a": {
             "type": "number",
             "description": "The first number to add."
           },
           "b": {
             "type": "number",
             "description": "The second number to add."
           }
         },
         "required": ["a", "b"]
       }
     },
     "output_schema": {
       "type": "number",
       "description": "The sum of the two numbers."
     }
   }
   ```

2. **Doorbell.Ring (No Output)**

   A tool that rings a doorbell but produces no output parameters.

   ```json
   {
     "id": "Doorbell.Ring@0.1.0",
     "name": "Doorbell_Ring",
     "description": "Rings a doorbell given a doorbell ID.",
     "version": "0.1.0",
     "input_schema": {
       "parameters": {
         "type": "object",
         "properties": {
           "doorbell_id": {
             "type": "string",
             "description": "The ID of the doorbell to ring."
           }
         },
         "required": ["doorbell_id"]
       }
     },
     "output_schema": null
   }
   ```

3. **System.GetTimestamp (No Input)**

   A tool that requires no input but produces a timestamp output.

   ```json
   {
     "id": "System.GetTimestamp@1.0.0",
     "name": "System_GetTimestamp",
     "description": "Retrieves the current system timestamp.",
     "version": "1.0.0",
     "input_schema": {
       "parameters": {
         "type": "object"
       }
     },
     "output_schema": {
       "type": "object",
       "properties": {
         "timestamp": {
           "type": "string",
           "format": "date-time",
           "description": "The current system timestamp."
         }
       },
       "required": ["timestamp"]
     }
   }
   ```

4. **Gmail.GetEmails (OAuth 2.0 Authorization)**

   A tool that retrieves emails from Gmail using OAuth 2.0 for authorization.

   ```json
   {
     "id": "Gmail.GetEmails@1.2.0",
     "name": "Gmail_GetEmails",
     "description": "Retrieves emails from Gmail using OAuth 2.0 authentication.",
     "version": "1.2.0",
     "input_schema": {
       "parameters": {
         "type": "object",
         "properties": {
           "query": {
             "type": "string",
             "description": "Search query for filtering emails."
           }
         },
         "required": []
       }
     },
     "output_schema": {
       "type": "object",
       "properties": {
         "emails": {
           "type": "array",
           "items": {
             "type": "object",
             "properties": {
               "id": { "type": "string" },
               "subject": { "type": "string" },
               "snippet": { "type": "string" }
             },
             "required": ["id", "subject", "snippet"]
           },
           "description": "List of retrieved emails."
         }
       },
       "required": ["emails"]
     },
     "requirements": {
       "authorization": [
         {
           "id": "google",
           "oauth2": {
             "scopes": ["https://www.googleapis.com/auth/gmail.readonly"]
           }
         }
       ],
       "user_id": true
     }
   }
   ```

5. **SMS.Send (Secret Requirement)**

   A tool that sends SMS messages using Twilio and requires a `TWILIO_API_KEY` secret.

   ```json
   {
     "id": "SMS.Send@0.1.2",
     "name": "SMS_Send",
     "description": "Sends SMS messages using Twilio. Requires a valid TWILIO_API_KEY.",
     "version": "0.1.2",
     "input_schema": {
       "parameters": {
         "type": "object",
         "properties": {
           "to": {
             "type": "string",
             "description": "Recipient phone number."
           },
           "message": {
             "type": "string",
             "description": "Message content to send."
           }
         },
         "required": ["to", "message"]
       }
     },
     "output_schema": {
       "type": "object",
       "properties": {
         "status": {
           "type": "string",
           "description": "Status of the SMS sending operation."
         }
       },
       "required": ["status"]
     },
     "requirements": {
       "secrets": [
         {
           "id": "TWILIO_API_KEY"
         }
       ]
     }
   }
   ```

### 4.2 Tool Request Schema

The `CallToolRequest` schema is designed to encapsulate the details of a tool execution (tool call).

#### Run and Execution Identification

- **`tool_id`**: The unique identifier of the tool to call.
- **`call_id`** (optional): A unique identifier and idempotency key for this tool call. If not provided, the server will generate one.
- **`trace_id`** (optional): Unique identifier for the trace of the tool call, if supplied by the client.

#### Input Parameters

- **`inputs`**: An unconstrained object containing the parameters needed by the tool.

#### Context

- **`context`** (optional): Provides additional execution context, e.g. authorization tokens, secrets, user-specific data, etc.

If the `requirements` field is present on a given tool definition, the client MUST provide the required information in the `context` field when calling the tool.

**`context.authorization`** (optional): Contains tokens for authentication.

If the `requirements.authorization` field is present on a given tool definition, the client MUST provide the required authorization information in the `context.authorization` field when calling the tool. The client SHOULD obtain authorization tokens itself or through a trusted intermediary.

Each item in the `authorization` array is an object with the following properties:

- **`id`**: The unique identifier for the authorization method or authorization provider.
- **`token`**: The token for the tool call.

**`context.secrets`** (optional): Contains secrets for the tool call.

If the `requirements.secrets` field is present on a given tool definition, the client MUST provide the required secrets in the `context.secrets` field when calling the tool. The client SHOULD obtain secrets itself or through a trusted intermediary.

Each item in the `secrets` array is an object with the following properties:

- **`id`**: The unique identifier for the secret.

#### Tool Version Resolution

Tools MUST be versioned using semantic versioning. A Tool Server MAY support multiple versions of a given tool, to allow clients to opt-in to new versions while preserving backwards compatibility.

When a client calls a tool, the server MUST resolve the version of the tool to call. The server MUST use the following rules to resolve the version of the tool to call:

1. Semantic Versioning: If the `version` field is present on the tool definition and is of the form `x.y.z` where `x`, `y`, and `z` are integers, the server MUST use the exact version specified in the `version` field. For example, `@1.0.0`.
2. Shorthand Versioning: If the `version` field is present on the tool definition and is of the form `x` where `x` is an integer, the server MUST use the version `x.0.0`. For example, `@1` which resolves to `1.0.0`.
3. Implied Latest Version: If the `version` field is not present on the tool definition, the server MUST use the latest version of the tool.

#### Non-Normative Examples

1. **Calculator.Add**

   A tool call request to add two numbers.

   ```json
   {
     "tool_id": "Calculator.Add@1.0.0",
     "call_id": "123e4567-e89b-12d3-a456-426614174000",
     "input": {
       "a": 10,
       "b": 5
     }
   }
   ```

2. **Doorbell.Ring (No Output)**

   A tool call request to ring a doorbell.

   ```json
   {
     "tool_id": "Doorbell.Ring@0.1.0",
     "call_id": "223e4567-e89b-12d3-a456-426614174001",
     "input": {
       "doorbell_id": "doorbell42"
     }
   }
   ```

3. **System.GetTimestamp (No Input)**

   A tool call request to retrieve the current system timestamp.

   ```json
   {
     "tool_id": "System.GetTimestamp@1.0.0",
     "call_id": "323e4567-e89b-12d3-a456-426614174002"
   }
   ```

4. **Gmail.GetEmails (OAuth 2.0 Authorization)**

   A tool call request to retrieve emails from Gmail using OAuth 2.0 for authorization.

   ```json
   {
     "tool_id": "Gmail.GetEmails@1.2.0",
     "call_id": "423e4567-e89b-12d3-a456-426614174003",
     "trace_id": "trace_123",
     "input": {
       "query": "is:unread"
     },
     "context": {
       "authorization": [
         {
           "id": "google",
           "token": "ya29.a0AfH6SMC..."
         }
       ],
       "user_id": "user_123"
     }
   }
   ```

5. **SMS.Send (Secret Requirement)**

   A tool call request to send an SMS using Twilio, which requires a secret.

   ```json
   {
     "tool_id": "SMS.Send@0.1.2",
     "call_id": "523e4567-e89b-12d3-a456-426614174004",
     "input": {
       "to": "+1234567890",
       "message": "Hello from our service!"
     },
     "context": {
       "secrets": [
         {
           "id": "TWILIO_API_KEY",
           "value": "TWILIO_SECRET_VALUE"
         }
       ]
     }
   }
   ```

### 4.3 Tool Response Schema

The `CallToolResponse` schema defines the structure of the data returned from a tool call.

#### Execution Metadata

- **`call_id`**: A unique identifier for this call.
- **`success`**: Boolean flag indicating the success or failure of the call.
- **`duration`** (optional): Call time in milliseconds.

#### Output Content

The output can take one of several forms:

1. **Value Response:**
   - Contains a `value` field that MUST be a JSON object, number, string, or boolean.
2. **Null Response:**
   - Does not contain a `value` field.
3. **Error Response:**
   - Contains an `error` object with:
     - **`message`**: A user-facing error message.
     - **`developer_message`** (optional): Detailed error information for internal debugging.
     - **`can_retry`** (optional): Indicates if the request can be retried by the client. If unspecified, the client MUST assume the request cannot be retried (`false`).
     - **`additional_prompt_content`** (optional): Extra content to be used for retry prompts.
     - **`retry_after_ms`** (optional): Suggested delay before retrying.

The `CallToolResponse` schema ensures that every response provides clear and actionable information regarding the outcome of the tool call.

#### Retrying Errors

If `can_retry` is `true`, the client SHOULD retry the tool call after the `retry_after_ms` delay.

If `additional_prompt_content` is present, the client MAY use it to provide additional context to the AI model when prompting it to retry the tool call. For example, the tool may return a list of suggested values that are close to the expected input for the model to evaluate.

#### Non-Normative Examples

1. **Calculator.Add (Success)**

   A response for a tool call to add two numbers.

   ```json
   {
     "call_id": "123e4567-e89b-12d3-a456-426614174000",
     "duration": 50,
     "success": true,
     "value": 15
   }
   ```

2. **Doorbell.Ring (Success, No Output)**

   A response for a tool call to ring a doorbell that does not return any output.

   ```json
   {
     "call_id": "223e4567-e89b-12d3-a456-426614174001",
     "duration": 30,
     "success": true,
     "value": null
   }
   ```

3. **System.GetTimestamp (Success)**

   A response for a tool call that retrieves the current system timestamp.

   ```json
   {
     "call_id": "323e4567-e89b-12d3-a456-426614174002",
     "duration": 25,
     "success": true,
     "value": {
       "timestamp": "2023-10-05T12:00:00Z"
     }
   }
   ```

4. **Gmail.GetEmails (Success)**

   A successful response for a Gmail tool call that returns a list of emails.

   ```json
   {
     "call_id": "423e4567-e89b-12d3-a456-426614174003",
     "duration": 120,
     "success": true,
     "value": {
       "emails": [
         {
           "id": "email_1",
           "subject": "Welcome to Gmail",
           "snippet": "Hello, welcome to your inbox!"
         },
         {
           "id": "email_2",
           "subject": "Your Receipt",
           "snippet": "Thank you for your purchase..."
         }
       ]
     }
   }
   ```

5. **SMS.Send (Success)**

   A successful response for a tool call that sends an SMS.

   ```json
   {
     "call_id": "523e4567-e89b-12d3-a456-426614174004",
     "duration": 80,
     "success": true,
     "value": {
       "status": "sent"
     }
   }
   ```

6. **Error Response with Message and Developer Message**

   A tool call error response that includes both a user-facing message and an internal developer message.

   ```json
   {
     "call_id": "623e4567-e89b-12d3-a456-426614174005",
     "duration": 40,
     "success": false,
     "error": {
       "message": "Could not reach the server",
       "developer_message": "The host api.example.com is not reachable"
     }
   }
   ```

7. **Error Response with Additional Prompt Content**

   An error response that offers additional context and retry guidance.

   ```json
   {
     "call_id": "723e4567-e89b-12d3-a456-426614174006",
     "duration": 60,
     "success": false,
     "error": {
       "message": "Doorbell ID not found",
       "developer_message": "The doorbell with ID 'doorbell1' does not exist.",
       "can_retry": true,
       "additional_prompt_content": "ids: doorbell42,doorbell84",
       "retry_after_ms": 500
     }
   }
   ```

## 5. Communication Flows

The Open Tool Calling (OTC) standard defines clear communication flows that enable clients to discover available tools and call them. The flows below follow the definitions in the OpenAPI specification (`specification/http/1.0/openapi.json`), ensuring that all tool interactions are consistent, secure, and standardized.

### Schema Resolution

The `$schema` field is used in requests and responses to indicate the version of the OTC standard that the client supports. If the `$schema` field is not included, the server MUST assume the client supports the latest version of the OTC standard.

```json
{
  "$schema": "https://github.com/OpenToolCalling/Specification/tree/main/specification/http/1.0/openapi.json"
}
```

The schema URI MUST be a valid URI.

### 5.1 Server Health Check

An OTC server MUST implement a health check endpoint that returns a 200 OK response if the server is healthy.

#### Flow Details

- **Request:**
  - **Method:** GET
  - **Endpoint:** `/health`
  - **Security:** No authentication is required.
- **Response:**
  - **Status Code:** 200 OK

If the server is ready to receive tool calls, the server MUST return a 200 OK response. The server MAY return an HTTP 503 response if it is not ready to receive tool calls.

#### Non-Normative Example: Server Health Check

**Request**

```http
GET /health HTTP/1.1
```

**Response**

```http
HTTP/1.1 200 OK
```

### 5.2 Tool Discovery

Clients retrieve tool definitions from the Tool Server using the `/tools` endpoint. This flow provides a catalog of tools that the client can use, all of which conform to the `ToolDefinition` schema.

#### Flow Details

- **Request:**
  - **Method:** GET
  - **Endpoint:** `/tools`
  - **Security:** Servers MAY require bearer authentication (JWT). Servers that are internet-facing SHOULD require authentication.
  - **Payload:** A JSON document containing:
    - **`$schema` Field** (optional): The client MAY include a `$schema` field in the request body to indicate the version of the OTC standard that the client supports. If the `$schema` field is not included, the server MUST assume the client supports the latest version of the OTC standard.
- **Response:**
  - **Status Code:** 200 OK
  - **Content:** A JSON object that includes a `$schema` URI reference (indicating the OTC version) and a `tools` array. Each element in the array is a complete tool definition. If there are no tools available, the `tools` array MUST be empty.

#### Non-Normative Example: Tool Discovery

**Request**

```http
GET /tools HTTP/1.1
Host: api.example.com
Authorization: Bearer <JWT token>
```

**Response (No Tools)**

```json
{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "tools": []
}
```

**Response (With Tools)**

```json
{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "tools": [
    {
      "id": "Calculator.Add@1.0.0",
      "name": "Calculator_Add",
      "description": "Adds two numbers together.",
      "version": "1.0.0",
      "input_schema": {
        "parameters": {
          "type": "object",
          "properties": {
            "a": {
              "type": "number",
              "description": "The first number to add."
            },
            "b": {
              "type": "number",
              "description": "The second number to add."
            }
          },
          "required": ["a", "b"]
        }
      },
      "output_schema": {
        "type": "number",
        "description": "The sum of the two numbers."
      }
    },
    {
      "id": "Doorbell.Ring@0.1.0",
      "name": "Doorbell_Ring",
      "description": "Rings a doorbell given a doorbell ID.",
      "version": "0.1.0",
      "input_schema": {
        "parameters": {
          "type": "object",
          "properties": {
            "doorbell_id": {
              "type": "string",
              "description": "The ID of the doorbell to ring."
            }
          },
          "required": ["doorbell_id"]
        }
      },
      "output_schema": null
    }
  ]
}
```

### 5.3 Tool Execution

Tool execution is initiated by sending a POST request to the `/tools/call` endpoint. This flow lets clients run a tool and receive its output, with the request and response bodies conforming to the `CallToolRequest` and `CallToolResponse` schemas.

#### Flow Details

- **Request:**
  - **Method:** POST
  - **Endpoint:** `/tools/call`
  - **Security:** Servers MAY require bearer authentication (JWT). Servers that are internet-facing SHOULD require authentication.
  - **Payload:** A JSON document containing:
    - **`$schema` Field** (optional): The client MAY include a `$schema` field in the request body to indicate the version of the OTC standard that the client supports. If the `$schema` field is not included, the server MUST assume the client supports the latest version of the OTC standard.
    - **`request` Object:** A JSON document following the `CallToolRequest` schema.
- **Response (Tool Execution):**
  - **Status Code:** 200 OK
  - **Content:** A JSON document following the `CallToolResponse` schema.
- **Response (Server Error):**
  - **Status Code:** 400
  - **Content:** A JSON document following the `ServerErrorResponse` schema.
- **Response (Input Validation Error):**
  - **Status Code:** 422
  - **Content:** A JSON document following the `ValidationErrorResponse` schema.

Servers MUST differentiate between:

1. Errors that occur before the tool is called.
2. Input validation errors.
3. Errors that occur during execution of the tool.

#### Server Errors

If an error occurs before the tool is called that is not related to input validation, the server MUST return a 400 response conforming to the `ServerErrorResponse` schema. Examples of such errors include:

- The tool server is temporarily unavailable.
- The requested version of the OTC standard is not supported.
- The requested tool ID is invalid or cannot be found.
- The requested tool version is not available.
- The tool server requires authentication, but the client did not provide valid credentials.

The `message` field MUST be present and SHOULD be a user-facing error message. The `developer_message` field MAY be present and SHOULD be an internal message that will be logged but will not be shown to the user or the AI model.

#### Input Validation

When a valid tool ID and version are provided, servers MUST validate the input parameters against the tool's `input_schema`. If the input parameters are invalid, the server MUST return a 422 response conforming to the `ValidationErrorResponse` schema. Servers MAY return a `parameter_errors` object that maps parameter names to error messages.

#### Tool Execution Errors

If an error occurs during execution of a tool, the server MUST return a 200 response conforming to the `CallToolResponse` schema, with a `success: false` and an `error` object.

#### Non-Normative Example: Tool Call

**Request**

```http
POST /call HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer <JWT token>

{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "request": {
    "call_id": "123e4567-e89b-12d3-a456-426614174000",
    "tool_id": "Calculator.Add@1.0.0",
    "input": {
      "a": 1,
      "b": 2
    }
  }
}
```

**Response (Successful Execution)**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "result": {
    "call_id": "123e4567-e89b-12d3-a456-426614174000",
    "duration": 2,
    "success": true,
    "value": 3
  }
}
```

**Response (Server Error)**

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "message": "Tool call failed",
  "developer_message": "Calculator.Add@2.0.0 is not available"
}
```

**Response (Input Validation Error)**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "message": "Some input parameters are invalid",
  "parameter_errors": {
    "a": "Must be a number",
    "b": "Must be a number"
  }
}
```

**Response (Tool Execution Error)**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "$schema": "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  "result": {
     "call_id": "723e4567-e89b-12d3-a456-426614174006",
     "duration": 60,
     "success": false,
     "error": {
       "message": "Doorbell ID not found",
       "developer_message": "The doorbell with ID 'doorbell1' does not exist.",
       "can_retry": true,
       "additional_prompt_content": "ids: doorbell42,doorbell84",
       "retry_after_ms": 500
     }
   }
}
```

## 6. Security and Authorization

Security is a critical component of the Open Tool Calling standard.

### Server Authentication

Server authentication describes how the server authenticates the client: which clients are allowed to make OTC protocol requests to the Tool Server.

Servers that are internet-facing SHOULD require authentication.

#### No Authentication

If a server is configured to not require authentication, the server MUST ignore the `Authorization` header.

#### API Key Authentication

A static API key is a simple shared secret that both the client and server know. This method provides simple authentication with minimal implementation complexity.

Requirements:

- The client MUST include the API key in the `X-API-Key` HTTP header with each request.
- Servers that support this authentication method MUST validate the API key against their stored value.
- Clients and servers MUST transmit API keys only over secure connections (HTTPS).
- Servers MUST reject requests with missing or invalid API keys with a 401 Unauthorized HTTP response.
- API keys SHOULD be generated with sufficient entropy (recommended minimum 32 bytes) and SHOULD be treated as sensitive information.

**Non-Normative Example: API Key**

```http
GET /tools HTTP/1.1
Host: api.example.com
X-API-Key: ahf62jd81hdk19akqnd62hdka
```

#### JWT Bearer Token Authentication

JSON Web Tokens (JWT) as described in [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) provide a more secure authentication mechanism that doesn't require sending the shared secret with each request.

Requirements:

- The client MUST include a valid JWT in the `Authorization` HTTP header using the Bearer scheme.
- The client MUST sign the JWT using the shared secret key using the HS256 algorithm.
- The server MUST validate the JWT signature using the shared secret key.
- The JWT MUST include the `exp` claim, which SHOULD be no more than 15 minutes in the future.
- The JWT MAY include the `aud` claim. If the `aud` claim is present, the server MUST validate it against the server's allowed client list.
- Servers MUST reject requests with missing, invalid, or expired JWTs with a 401 Unauthorized HTTP response.
- Servers SHOULD enforce a reasonably short expiration time for JWTs to limit potential damage from token exposure.

**Non-Normative Example: JWT Bearer Token**

```http
GET /tools HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJvdGNzZXJ2ZXIiLCJleHAiOjE3NDE3MjQyMTl9.FPIFSSUmngbyePKghI54zUJ-dUxCrh4ZnP9TId5zk34
```

#### Selecting an Authentication Method

Servers MUST document which authentication methods they support. Servers MAY support multiple authentication methods simultaneously.

Clients SHOULD prefer JWT Bearer token authentication over static API key authentication when both are available, due to its enhanced security properties.

For highly sensitive operations or production environments, servers SHOULD consider implementing additional security measures beyond these basic authentication methods, such as IP allowlisting, rate limiting, or more sophisticated authentication protocols.

### Tool Authorization

Tool authorization describes how the server authorizes the tool call: given a tool's definition, whether the client needs to authorize the user before calling the tool.

Tools MAY require token-based or other forms of authorization, as specified in the `requirements.authorization` field of the Tool Definition schema.

When a given tool describes authorization requirements in the `requirements.authorization` field, the client MUST resolve (or delegate to a trusted intermediary) the authorization requirements and provide the necessary credentials (e.g. a token) in the Tool Call Request, before calling the tool.

If the client does not provide a valid token in the Tool Call Request for a tool that requires authorization, the server MUST return a 400 Bad Request response as described in the Tool Execution (Server Errors) section.

#### Non-Normative Example: Tool Authorization Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant AS as Authorization Server
    participant S as Tool Server
    participant T as Tool

    U->>C: Input: "Read my recent emails"<br/>user_id: bob@example.com
    Note over C: Tool Gmail.GetEmails has an authorization requirement:<br/>id: google<br/>scopes: [https://www.googleapis.com/auth/gmail.readonly]
    C-->>AS: OAuth 2.0 request
    AS-->>C: Scoped token for user
    C->>S: Call tool Gmail.GetEmails with token
    S->>T: Run tool (function)
    T->>S: Return tool response
    S->>C: Return tool response

```

### Tool Secrets Management

Tool secrets are sensitive information that is required to call a tool, such as API keys, passwords, and other credentials.

Tools MAY require secrets, as specified in the `requirements.secrets` field of the Tool Definition schema.

When a tool requires secrets, the client MUST retrieve the secrets (itself or via a trusted intermediary) and provide them in the Tool Call Request, before calling the tool.

If the client does not provide a secret in the Tool Call Request for a tool that requires a secret, the server MUST return a 400 Bad Request response as described in the Tool Execution (Server Errors) section.

#### Non-Normative Example: Tool Secrets Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant SM as Secrets Manager
    participant S as Tool Server
    participant T as Tool

    U->>C: Input: "Send an SMS to +15556051234567"<br/>user_id: bob@example.com
    Note over C: Tool SMS.Send has a secret requirement:<br/>id: TWILIO_API_KEY
    C-->>SM: Get secret TWILIO_API_KEY
    SM-->>C: TWILIO_API_KEY=abc123...
    C->>S: Call tool SMS.Send with TWILIO_API_KEY=abc123...
    S->>T: Run tool (function)
    T->>S: Return tool response
    S->>C: Return tool response
```

## 7. Extensibility and Versioning

- **Extensibility:**
  The Open Tool Calling standard is designed to be extensible.

  - New parameters or response types can be added as additional properties in the respective schemas.
  - The use of JSON-Schema allows for backward-compatible extensions.

- **Versioning:**
  - Each server response must include a `$schema` field that references the version of the Open Tool Calling standard that was used to generate the response.

Proper versioning guarantees that changes to the standard do not disrupt existing implementations.

## 8. Conclusion

The Open Tool Calling standard provides a robust framework for client-to-tool communications. By standardizing tool definitions, request formats, and response structures, this standard promotes interoperability, consistency, and security in distributed systems. Adoption of this standard will facilitate seamless integration between diverse clients and tools across multiple platforms.
