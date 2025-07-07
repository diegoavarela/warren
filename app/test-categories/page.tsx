"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";

export default function TestCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string>("");
  const { user } = useAuth();
  
  // Get company ID from user context or hardcode for testing
  const companyId = user?.currentCompanyId || "550e8400-e29b-41d4-a716-446655440000"; // Replace with actual company ID
  
  useEffect(() => {
    if (companyId) {
      fetchCategories();
    }
  }, [companyId]);
  
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
        setTestResult(`✅ Loaded ${data.data?.length || 0} custom categories`);
      } else {
        setTestResult("❌ Failed to load categories");
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };
  
  const createTestCategory = async () => {
    setLoading(true);
    try {
      const testCategory = {
        categoryKey: `test_category_${Date.now()}`,
        label: `Test Category ${new Date().toLocaleTimeString()}`,
        isInflow: false,
        statementType: 'profit_loss',
        description: 'Test category created for verification',
        sortOrder: 999
      };
      
      const response = await fetch(`/api/companies/${companyId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCategory)
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ Created category: ${data.data.label}`);
        await fetchCategories(); // Reload categories
      } else {
        const error = await response.json();
        setTestResult(`❌ Failed to create: ${error.error}`);
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`);
    }
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Custom Categories</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Company ID: {companyId}</p>
                <p className="text-sm text-gray-600 mb-4">Total Categories: {categories.length}</p>
              </div>
              
              <div className="flex space-x-4">
                <Button 
                  onClick={fetchCategories}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh Categories"}
                </Button>
                
                <Button 
                  onClick={createTestCategory}
                  disabled={loading}
                  variant="primary"
                >
                  Create Test Category
                </Button>
              </div>
              
              {testResult && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <pre className="text-sm">{testResult}</pre>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Custom Categories</CardTitle>
          </CardHeader>
          <CardBody>
            {categories.length === 0 ? (
              <p className="text-gray-600">No custom categories found</p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{cat.label}</h3>
                        <p className="text-sm text-gray-600">
                          Key: {cat.categoryKey} | 
                          Type: {cat.statementType} | 
                          Flow: {cat.isInflow ? "Inflow" : "Outflow"}
                        </p>
                        {cat.description && (
                          <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}