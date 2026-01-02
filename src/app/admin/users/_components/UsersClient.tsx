"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

export default function UsersClient() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        size="sm" 
        className="gap-2 font-bold uppercase text-xs"
      >
        <UserPlus size={16} />
        Add Admin
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
             <h2 className="font-black uppercase tracking-tight mb-4">Create New Admin</h2>
             <div className="space-y-4">
                <p className="text-sm text-gray-500 font-medium">Add a user to the administration panel.</p>
                <Button variant="secondary" onClick={() => setIsOpen(false)} className="w-full">
                  Cancel
                </Button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
