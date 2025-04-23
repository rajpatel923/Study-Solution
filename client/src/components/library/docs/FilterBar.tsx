"use client";

import React, { useState } from 'react';
import { Filter, ChevronDown, Check } from 'lucide-react';
import { FileCategory, SortOption, ViewMode } from '@/lib/documents';

interface FilterBarProps {
  activeCategory: FileCategory;
  onCategoryChange: (category: FileCategory) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  viewMode,
  onViewModeChange
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const categories: FileCategory[] = ['All', 'PDF', 'Image', 'Video', 'Other'];
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
    { value: 'size', label: 'Size' },
    { value: 'type', label: 'Type' }
  ];

  const toggleCategoryDropdown = () => {
    setShowCategoryDropdown(!showCategoryDropdown);
    if (showSortDropdown) setShowSortDropdown(false);
  };

  const toggleSortDropdown = () => {
    setShowSortDropdown(!showSortDropdown);
    if (showCategoryDropdown) setShowCategoryDropdown(false);
  };

  const handleCategorySelect = (category: FileCategory) => {
    onCategoryChange(category);
    setShowCategoryDropdown(false);
  };

  const handleSortSelect = (sort: SortOption) => {
    onSortChange(sort);
    setShowSortDropdown(false);
  };

  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 items-center bg-white px-3 py-2 rounded-lg border border-gray-200">
      <div className="relative">
        <button
          className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 focus:outline-none"
          onClick={toggleCategoryDropdown}
        >
          <Filter size={16} />
          <span>{activeCategory}</span>
          <ChevronDown size={16} className={`transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showCategoryDropdown && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 py-1">
            {categories.map((category) => (
              <button 
                key={category}
                className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => handleCategorySelect(category)}
              >
                {category === activeCategory && <Check size={16} className="text-indigo-600 mr-2" />}
                <span className={category === activeCategory ? 'text-indigo-600 font-medium' : 'text-gray-700'}>
                  {category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="h-5 border-r border-gray-200 hidden sm:block"></div>
      
      <div className="relative">
        <button
          className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 focus:outline-none"
          onClick={toggleSortDropdown}
        >
          <span>Sort by: </span>
          <span className="text-indigo-600">
            {sortOptions.find(option => option.value === sortBy)?.label || 'Name'}
          </span>
          <ChevronDown size={16} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showSortDropdown && (
          <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 py-1">
            {sortOptions.map((option) => (
              <button 
                key={option.value}
                className="flex items-center w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                onClick={() => handleSortSelect(option.value)}
              >
                {option.value === sortBy && <Check size={16} className="text-indigo-600 mr-2" />}
                <span className={option.value === sortBy ? 'text-indigo-600 font-medium' : 'text-gray-700'}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="h-5 border-r border-gray-200 hidden sm:block"></div>
      
      <button
        className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 focus:outline-none"
        onClick={toggleSortOrder}
      >
        <span>Order: </span>
        <span className="text-indigo-600">{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
      </button>
      
      <div className="h-5 border-r border-gray-200 hidden sm:block ml-auto"></div>
      
      <div className="flex items-center space-x-1">
        <button
          className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
          onClick={() => onViewModeChange('grid')}
          title="Grid view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button
          className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
          onClick={() => onViewModeChange('list')}
          title="List view"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FilterBar;