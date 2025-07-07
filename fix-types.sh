#!/bin/bash

# Fix type errors in API routes

# Fix companies route
sed -i '' 's/users: userCompanies.map(uc =>/users: userCompanies.map((uc: any) =>/' app/api/companies/route.ts

# Fix platform health route - change the type definition
sed -i '' 's/status: "operational"/status: "operational" as "operational" | "degraded" | "down"/' app/api/platform/health/route.ts

# Fix search route
sed -i '' 's/const results = \[\]/const results: any[] = []/' app/api/search/route.ts
sed -i '' 's/organizations.map(org =>/organizations.map((org: any) =>/' app/api/search/route.ts
sed -i '' 's/companiesResult.map(company =>/companiesResult.map((company: any) =>/' app/api/search/route.ts
sed -i '' 's/usersResult.map(u =>/usersResult.map((u: any) =>/' app/api/search/route.ts
sed -i '' 's/templatesResult.map(template =>/templatesResult.map((template: any) =>/' app/api/search/route.ts

# Fix test-data route
sed -i '' 's/lineItems.map(item =>/lineItems.map((item: any) =>/' app/api/test-data/route.ts

# Fix test-db route
sed -i '' 's/allUsers.map(u =>/allUsers.map((u: any) =>/' app/api/test-db/route.ts

# Fix validate-persistence route
sed -i '' 's/persistedData.lineItems.filter(item =>/persistedData.lineItems.filter((item: any) =>/' app/api/test/validate-persistence/route.ts
sed -i '' 's/lineItems.filter(i =>/lineItems.filter((i: any) =>/' app/api/test/validate-persistence/route.ts

# Fix financial-analytics route
sed -i '' 's/lineItems.filter(item =>/lineItems.filter((item: any) =>/' app/api/v1/companies/\[id\]/financial-analytics/route.ts
sed -i '' 's/\[...uniqueCategories\]/Array.from(uniqueCategories)/' app/api/v1/companies/\[id\]/financial-analytics/route.ts
sed -i '' 's/lineItemsByCategory\[category\].map(item =>/lineItemsByCategory[category].map((item: any) =>/' app/api/v1/companies/\[id\]/financial-analytics/route.ts
sed -i '' 's/calculateCashFlow(item =>/calculateCashFlow((item: any) =>/' app/api/v1/companies/\[id\]/financial-analytics/route.ts

# Fix statements route
sed -i '' 's/lineItems.map(item =>/lineItems.map((item: any) =>/' app/api/v1/companies/\[id\]/statements/\[statementId\]/route.ts

echo "Type fixes applied!"