const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");

// Function to validate request/response against an API path in the OpenAPI spec
function validateAgainstPath(
  requestData,
  responseData,
  statusCode,
  pathUrl,
  method
) {
  // Load the OpenAPI spec
  const openApiSpec = JSON.parse(
    fs.readFileSync("./specification/http/1.0/openapi.json", "utf8")
  );

  // Get the path definition
  const pathDef = openApiSpec.paths[pathUrl];
  if (!pathDef) {
    throw new Error(`Path "${pathUrl}" not found in the OpenAPI spec`);
  }

  // Get the method definition
  const methodDef = pathDef[method.toLowerCase()];
  if (!methodDef) {
    throw new Error(`Method "${method}" not found for path "${pathUrl}"`);
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

  const result = {
    requestValid: true,
    responseValid: true,
    requestErrors: null,
    responseErrors: null,
  };

  // Validate request if there's a requestBody in the spec
  if (
    methodDef.requestBody &&
    methodDef.requestBody.content &&
    methodDef.requestBody.content["application/json"] &&
    methodDef.requestBody.content["application/json"].schema
  ) {
    const requestSchema =
      methodDef.requestBody.content["application/json"].schema;
    const validateRequest = ajv.compile(requestSchema);
    result.requestValid = validateRequest(requestData);
    result.requestErrors = validateRequest.errors;
  }

  // Validate response if there's a response definition for the status code
  if (
    methodDef.responses &&
    methodDef.responses[statusCode] &&
    methodDef.responses[statusCode].content &&
    methodDef.responses[statusCode].content["application/json"] &&
    methodDef.responses[statusCode].content["application/json"].schema
  ) {
    const responseSchema =
      methodDef.responses[statusCode].content["application/json"].schema;
    //console.log("Validating response against schema:", responseSchema);
    const validateResponse = ajv.compile(responseSchema);
    result.responseValid = validateResponse(responseData);
    result.responseErrors = validateResponse.errors;
  } else {
    throw new Error(
      `Response for status code "${statusCode}" not found in the OpenAPI spec for path "${pathUrl}" and method "${method}"`
    );
  }

  return result;
}

// Example usage
const requestToValidate = {
  $schema:
    "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  request: {
    call_id: "123e4567-e89b-12d3-a456-426614174000",
    tool_id: "Calculator.Add@1.0.0",
    input: {
      a: 1,
      b: 2,
    },
  },
};

const responseToValidate = {
  $schema:
    "https://github.com/ArcadeAI/OpenToolCalling/tree/main/specification/http/1.0/openapi.json",
  result: {
    call_id: "723e4567-e89b-12d3-a456-426614174006",
    duration: 60,
    success: false,
    error: {
      message: "Doorbell ID not found",
      developer_message: "The doorbell with ID 'doorbell1' does not exist.",
      can_retry: true,
      additional_prompt_content: "ids: doorbell42,doorbell84",
      retry_after_ms: 500,
    },
  },
};

const result = validateAgainstPath(
  requestToValidate,
  responseToValidate,
  "200",
  "/tools/call",
  "POST"
);

console.log("Request validation:", result.requestValid ? "Passed!" : "Failed!");
if (!result.requestValid) {
  console.log(
    "Request validation errors:",
    JSON.stringify(result.requestErrors, null, 2)
  );
}

console.log(
  "Response validation:",
  result.responseValid ? "Passed!" : "Failed!"
);
if (!result.responseValid) {
  console.log(
    "Response validation errors:",
    JSON.stringify(result.responseErrors, null, 2)
  );
}
