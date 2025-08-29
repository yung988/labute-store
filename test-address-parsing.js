// Test script for Czech address parsing
// Run with: node test-address-parsing.js

// Mock the parseAddressFallback function from the API route
function parseAddressFallback(addressString) {
  let street = addressString;
  let houseNumber = '';
  let city = '';
  let postalCode = '';

  // Try to extract postal code (Czech format: 123 45 or 12345)
  const postalMatch = addressString.match(/(\d{3}\s?\d{2})\s*$/);
  if (postalMatch) {
    postalCode = postalMatch[1].replace(/\s/g, '');
    // Remove postal code from address string
    addressString = addressString.replace(/\s*\d{3}\s?\d{2}\s*$/, '').trim();
  }

  // Try to extract house number from the end
  const houseNumberMatch = addressString.match(/^(.+?)\s+(\d+(?:\/\d+)?[a-zA-Z]?)$/);
  if (houseNumberMatch) {
    street = houseNumberMatch[1].trim();
    houseNumber = houseNumberMatch[2];
  } else {
    street = addressString;
  }

  // For Czech addresses, if we have a postal code, we can try to infer the city
  if (postalCode && !city) {
    const postalNum = parseInt(postalCode);
    if (postalNum >= 10000 && postalNum < 20000) {
      city = 'Praha'; // Prague area
    } else if (postalNum >= 70000 && postalNum < 80000) {
      city = 'Ostrava'; // Ostrava area
    } else if (postalNum >= 60000 && postalNum < 70000) {
      city = 'Brno'; // Brno area
    }
  }

  return { street, houseNumber, city, postalCode };
}

// Test cases for Czech addresses
const testCases = [
  {
    input: "Biskupice-Pulkov 72 67557",
    expected: { street: "Biskupice-Pulkov", houseNumber: "72", city: "", postalCode: "67557" }
  },
  {
    input: "Hlavní 123 11000",
    expected: { street: "Hlavní", houseNumber: "123", city: "Praha", postalCode: "11000" }
  },
  {
    input: "Náměstí Míru 15/2 60200",
    expected: { street: "Náměstí Míru", houseNumber: "15/2", city: "Brno", postalCode: "60200" }
  },
  {
    input: "Václavské náměstí 68 11000",
    expected: { street: "Václavské náměstí", houseNumber: "68", city: "Praha", postalCode: "11000" }
  },
  {
    input: "Masarykova 45 70200",
    expected: { street: "Masarykova", houseNumber: "45", city: "Ostrava", postalCode: "70200" }
  },
  {
    input: "Národní třída 25 11121",
    expected: { street: "Národní třída", houseNumber: "25", city: "Praha", postalCode: "11121" }
  }
];

console.log("Testing Czech address parsing...\n");

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = parseAddressFallback(testCase.input);
  const success = JSON.stringify(result) === JSON.stringify(testCase.expected);

  console.log(`Test ${index + 1}: ${testCase.input}`);
  console.log(`Expected: ${JSON.stringify(testCase.expected)}`);
  console.log(`Got:      ${JSON.stringify(result)}`);
  console.log(`Result:   ${success ? '✅ PASS' : '❌ FAIL'}\n`);

  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`Summary: ${passed} passed, ${failed} failed`);

// Special test for the problematic address
console.log("\n=== Special test for Biskupice-Pulkov ===");
const specialResult = parseAddressFallback("Biskupice-Pulkov 72 67557");
console.log("Input: Biskupice-Pulkov 72 67557");
console.log("Parsed result:", specialResult);
console.log("Has street:", !!specialResult.street);
console.log("Has house number:", !!specialResult.houseNumber);
console.log("Has postal code:", !!specialResult.postalCode);
console.log("City (may be empty):", specialResult.city || "Not inferred from postal code");