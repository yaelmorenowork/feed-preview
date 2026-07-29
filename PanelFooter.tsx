"use client";

export default function PanelFooter({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-auto border-t border-[#F2F2F2] px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-xl py-2.5 text-[13px] font-medium text-neutral-500 transition-colors duration-200 ease-out hover:bg-neutral-50 hover:text-neutral-700"
      >
        Close
      </button>
    </div>
  );
}
