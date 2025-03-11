const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");

// Function to validate JSON against a schema from your OpenAPI spec
function validateAgainstSchema(jsonData, schemaName) {
  // Load the OpenAPI spec
  const openApiSpec = JSON.parse(
    fs.readFileSync("./specification/http/1.0/openapi.json", "utf8")
  );

  // Get the schema by name from components.schemas
  const schema = openApiSpec.components.schemas[schemaName];

  if (!schema) {
    throw new Error(`Schema "${schemaName}" not found in the OpenAPI spec`);
  }

  // Create Ajv instance with the right options for OpenAPI 3.1
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    validateFormats: true,
  });

  // Add formats support (uri, email, etc.)
  addFormats(ajv);

  // Add all schemas from the spec to allow for references
  for (const [name, schemaObj] of Object.entries(
    openApiSpec.components.schemas
  )) {
    ajv.addSchema(schemaObj, `#/components/schemas/${name}`);
  }

  // Validate the data against the schema
  const validate = ajv.compile(schema);
  const valid = validate(jsonData);

  return {
    valid,
    errors: validate.errors,
  };
}

// Example usage
const toolDefinition = {
  id: "SMS.Send@0.1.2",
  name: "SMS_Send",
  description:
    "Sends SMS messages using Twilio. Requires a valid TWILIO_API_KEY.",
  version: "0.1.2",
  input_schema: {
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Recipient phone number.",
        },
        message: {
          type: "string",
          description: "Message content to send.",
        },
      },
      required: ["to", "message"],
    },
  },
  output_schema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description: "Status of the SMS sending operation.",
      },
    },
    required: ["status"],
  },
  requirements: {
    secrets: [
      {
        id: "TWILIO_API_KEY",
      },
    ],
  },
};

const result = validateAgainstSchema(toolDefinition, "ToolDefinition");
console.log(result.valid ? "Validation passed!" : "Validation failed!");
if (!result.valid) {
  console.log(JSON.stringify(result.errors, null, 2));
}
