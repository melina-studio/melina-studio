// Example usage of useDebouncedCallback hook

import { useDebouncedCallback } from './debounce';
import { useState } from 'react';

export function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);

  // Example 1: Debounced search
  const performSearch = async (query: string) => {
    console.log('Searching for:', query);
    // API call here
    const response = await fetch(`/api/search?q=${query}`);
    const data = await response.json();
    setResults(data);
  };

  const debouncedSearch = useDebouncedCallback(
    performSearch,
    500, // 500ms delay
    [performSearch],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value); // This will be debounced
  };

  return (
    <div>
      <input type="text" value={searchTerm} onChange={handleInputChange} placeholder="Search..." />
      {/* Results display */}
    </div>
  );
}

export function AutoSaveForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });

  // Example 2: Auto-save form
  const saveForm = async (data: typeof formData) => {
    console.log('Saving form:', data);
    await fetch('/api/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  const debouncedSave = useDebouncedCallback(saveForm, 1000, [saveForm]);

  const handleChange = (field: string, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    debouncedSave(newData); // Auto-save after 1 second of inactivity
  };

  return (
    <form>
      <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} />
      <input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} />
    </form>
  );
}

export function WindowResizeHandler() {
  // Example 3: Debounced window resize handler
  const handleResize = () => {
    console.log('Window resized:', window.innerWidth, window.innerHeight);
    // Expensive calculations here
  };

  const debouncedResize = useDebouncedCallback(handleResize, 300, []);

  // Use in useEffect
  // useEffect(() => {
  //   window.addEventListener('resize', debouncedResize);
  //   return () => window.removeEventListener('resize', debouncedResize);
  // }, [debouncedResize]);

  return <div>Resize the window</div>;
}
