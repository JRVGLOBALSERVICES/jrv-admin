"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { UserPlus, X } from "lucide-react";

export default function UsersClient() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        className="gap-2 font-bold uppercase tracking-tighter text-xs"
        size="sm"
      >
        <UserPlus size={16} />
        Add New Admin
      </Button>

      {/* Logic for Add Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-gray-900 uppercase tracking-tight">Create Administrator</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-medium">
                Enter the email address of the user you want to promote to an admin role.
              </p>
              {/* Add your Form/Input logic here */}
              <div className="pt-4 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1">Invite User</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
