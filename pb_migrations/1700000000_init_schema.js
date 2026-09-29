// PocketBase Auto-Migration for Initial Collections
migrate((app) => {
  const collectionNames = [
    'inventory',
    'orders',
    'stores',
    'customers',
    'store_expenses',
    'purchase_orders',
    'inward_bills',
    'stock_transfers',
    'store_indents',
    'suppliers',
    'system_metadata',
  ];

  for (const name of collectionNames) {
    try {
      // Check if collection already exists
      app.findCollectionByNameOrId(name);
    } catch {
      // Create collection with public read/write rules
      const collection = new Collection({
        name: name,
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'recordId', type: 'text', required: false },
          { name: 'data', type: 'json', required: false },
          { name: 'updatedAt', type: 'text', required: false },
        ],
      });
      app.save(collection);
    }
  }
}, (app) => {
  // Optional down migration
});
