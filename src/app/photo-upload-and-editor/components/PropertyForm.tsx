'use client';

import { PropertyDetails } from './PhotoEditorInteractive';
import Icon from '@/components/ui/AppIcon';

interface PropertyFormProps {
  details: PropertyDetails;
  errors: Partial<PropertyDetails>;
  onChange: (updated: PropertyDetails) => void;
  onListingTypeChange?: (type: string) => void;
  listingType?: string;
}

interface FieldConfig {
  key: keyof PropertyDetails;
  label: string;
  placeholder: string;
  type: string;
  icon: string;
  colSpan?: string;
}

const fields: FieldConfig[] = [
  {
    key: 'address',
    label: 'Property Address',
    placeholder: '123 Sunset Blvd, Beverly Hills, CA 90210',
    type: 'text',
    icon: 'MapPinIcon',
    colSpan: 'col-span-2',
  },
  {
    key: 'beds',
    label: 'Bedrooms',
    placeholder: '4',
    type: 'number',
    icon: 'HomeIcon',
  },
  {
    key: 'baths',
    label: 'Bathrooms',
    placeholder: '3',
    type: 'number',
    icon: 'SparklesIcon',
  },
  {
    key: 'sqft',
    label: 'Square Footage',
    placeholder: '2,850',
    type: 'text',
    icon: 'Squares2X2Icon',
  },
  {
    key: 'listingPrice',
    label: 'Listing Price',
    placeholder: '$1,250,000',
    type: 'text',
    icon: 'CurrencyDollarIcon',
    colSpan: 'col-span-2',
  },
];

const LISTING_TYPE_OPTIONS = [
  'Just Listed',
  'Just Sold',
  'Under Contract',
  'Open House',
  'Price Reduced',
  'Coming Soon',
  'Lease',
];

export default function PropertyForm({
  details,
  errors,
  onChange,
  onListingTypeChange,
  listingType = 'Just Listed',
}: PropertyFormProps) {
  const handleChange = (key: keyof PropertyDetails, value: string) => {
    onChange({ ...details, [key]: value });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
      <h2
        className="text-white mb-4 uppercase tracking-widest"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
      >
        Property Details
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {fields.map((field) => (
          <div key={field.key} className={field.colSpan || 'col-span-1'}>
            <label
              htmlFor={`field-${field.key}`}
              className="block text-xs text-[#B8B8B8] mb-1.5 flex items-center gap-1.5"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Icon name={field.icon as any} size={12} variant="outline" className="text-[#E8002A]" />
              {field.label}
            </label>
            <input
              id={`field-${field.key}`}
              type={field.type}
              value={details[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              min={field.type === 'number' ? '0' : undefined}
              className={`
                w-full bg-[#111111] text-white text-sm rounded-md px-3 py-2.5
                border transition-colors duration-200 outline-none
                placeholder:text-[#555]
                focus:border-[#E8002A] focus:ring-1 focus:ring-[#E8002A]/30
                ${errors[field.key] ? 'border-red-500' : 'border-white/10 hover:border-white/20'}
              `}
              style={{ fontFamily: 'Inter, sans-serif', minHeight: '44px' }}
              aria-describedby={errors[field.key] ? `error-${field.key}` : undefined}
            />
            {errors[field.key] && (
              <p
                id={`error-${field.key}`}
                className="mt-1 text-xs text-red-400 flex items-center gap-1"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <Icon name="ExclamationCircleIcon" size={12} variant="solid" />
                {errors[field.key]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Preview of overlay text */}
      {(details.address || details.beds || details.baths || details.sqft) && (
        <div className="mt-4 p-3 rounded-md bg-[#1A1A1A] border border-white/5">
          <p className="text-xs text-[#B8B8B8] mb-2 uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem' }}>
            Overlay Preview Text
          </p>
          <p className="text-[#E8002A] text-xs italic mb-0.5" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {listingType}
          </p>
          {details.address && (
            <p className="text-white text-xs font-bold uppercase tracking-wide" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {details.address}
            </p>
          )}
          {(details.beds || details.baths || details.sqft) && (
            <p className="text-[#E8E8E8] text-xs mt-0.5" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {[
                details.beds && `${details.beds} Beds`,
                details.baths && `${details.baths} Baths`,
                details.sqft && `${details.sqft} Sq Ft`,
              ]
                .filter(Boolean)
                .join(' | ')}
            </p>
          )}
          {details.listingPrice && (
            <p className="text-white text-xs font-semibold mt-0.5" style={{ fontFamily: 'Libre Baskerville, serif' }}>
              {details.listingPrice.startsWith('$') ? details.listingPrice : `$${details.listingPrice}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}