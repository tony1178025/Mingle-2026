import { CustomerApp } from "@/components/customer/CustomerApp";

export default function CustomerPage() {
  // Operational PWA entry for QR users. No marketing landing in this route.
  return (
    <div className="mg-pwa">
      <CustomerApp />
    </div>
  );
}
