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
const jsonToValidate = {
  call_id: "123e4567-e89b-12d3-a456-426614174000",
  duration: 2,
  success: true,
  value: 3,
};

const result = validateAgainstSchema(jsonToValidate, "CallToolResponse");
console.log(result.valid ? "Validation passed!" : "Validation failed!");
if (!result.valid) {
  console.log(JSON.stringify(result.errors, null, 2));
}
