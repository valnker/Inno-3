import React from 'react';
import type { Story } from '../types';

interface DeleteConfirmationModalProps {
  story: Story;
  onClose: () => void;
  onConfirm: (story: Story) => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ story, onClose, onConfirm }) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-gray-800">Delete Story</h2>
        <p className="text-gray-600">
          Are you sure you want to permanently delete "{story.title}"? This action cannot be undone.
        </p>
        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={onClose}
            className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-full hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(story)}
            className="bg-red-500 text-white font-bold py-2 px-6 rounded-full hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};