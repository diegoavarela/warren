#!/bin/bash

# Fix organizations page
cat > /tmp/org-fix.txt << 'EOF'
    <DashboardLayout
      title="Organizations"
      description="Manage platform organizations"
    >
EOF

sed -i '' '/DashboardLayout/,/>/c\
'"$(cat /tmp/org-fix.txt)" app/organizations/page.tsx

# Fix users page
cat > /tmp/user-fix.txt << 'EOF'
    <DashboardLayout
      title="User Management"
      description="Manage platform users across all organizations"
    >
EOF

sed -i '' '/DashboardLayout/,/>/c\
'"$(cat /tmp/user-fix.txt)" app/users/page.tsx

# Fix companies page
cat > /tmp/comp-fix.txt << 'EOF'
    <DashboardLayout
      title="Companies"
      description="Manage companies across all organizations"
    >
EOF

sed -i '' '/DashboardLayout/,/>/c\
'"$(cat /tmp/comp-fix.txt)" app/companies/page.tsx

# Remove remaining stray imports
for file in app/organizations/page.tsx app/users/page.tsx app/companies/page.tsx; do
  grep -v "import { apiRequest }.*;" "$file" | grep -v "^import { apiRequest }.*title" > "/tmp/$(basename $file)"
  mv "/tmp/$(basename $file)" "$file"
done

rm -f /tmp/org-fix.txt /tmp/user-fix.txt /tmp/comp-fix.txt