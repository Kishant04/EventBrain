import React from 'react';

const VendorCards = ({ vendors }) => {
  return (
    <div className="grid grid-cols-1 gap-sm animate-slide-up-fade" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
      {vendors.map((vendor, index) => (
        <div key={index} className="bg-white border border-[#E5E7EB] p-md rounded-lg hover:border-primary transition-all">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#111827]">{vendor.name}</p>
              <p className="text-xs text-[#4B5563] mt-1">Vendor ID: {vendor.vendorId ?? '-'}</p>
            </div>
            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded-full uppercase ${
              vendor.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {vendor.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs text-[#374151]">
            <p>Total estimate: <span className="font-semibold text-primary">{vendor.totalPrice}</span></p>
            <p>Price per pax: <span className="font-semibold">{vendor.pricePerPax}</span></p>
            <p>Rating: <span className="font-semibold">{vendor.rating}</span></p>
            <p>Speciality: <span className="font-semibold">{vendor.speciality}</span></p>
            <p className="md:col-span-2">Contact: <span className="font-semibold">{vendor.contactEmail}</span></p>
            <p className="md:col-span-2">Why recommended: <span className="font-semibold">{vendor.reason}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VendorCards;
