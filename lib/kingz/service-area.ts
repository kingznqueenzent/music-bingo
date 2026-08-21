/**
 * Service area copy and schema helpers — single source from site-config.
 * Do not invent offices, street addresses, or city landing pages.
 */

import siteConfig from '@/config/site-config'

type ServiceAreaConfig = {
  basedIn: string
  basedInProvince: string
  basedInLabel: string
  regionLabel: string
  cities: string[]
  travelCities: string[]
  sectionHeading: string
  sectionCopy: string
  travelInquiryCopy: string
  bookingNote: string
  travelDiscussNote: string
}

const raw = (siteConfig as { serviceArea?: ServiceAreaConfig }).serviceArea

export const SERVICE_AREA: ServiceAreaConfig = {
  basedIn: raw?.basedIn || 'Brantford',
  basedInProvince: raw?.basedInProvince || 'Ontario',
  basedInLabel: raw?.basedInLabel || 'Brantford, Ontario',
  regionLabel: raw?.regionLabel || 'Southern Ontario',
  cities: [...(raw?.cities ?? [])],
  travelCities: [...(raw?.travelCities ?? [])],
  sectionHeading: raw?.sectionHeading || 'DJ SERVICES ACROSS SOUTHERN ONTARIO',
  sectionCopy:
    raw?.sectionCopy ||
    'Based in Brantford, Kingz & Queenz Entertainment brings professional DJ entertainment to weddings, private parties, corporate events and special celebrations throughout Hamilton, Cambridge, Kitchener-Waterloo, Burlington, London, Toronto, Niagara and communities across Ontario.',
  travelInquiryCopy:
    raw?.travelInquiryCopy ||
    'Planning an event outside these areas? Contact us about travel and availability.',
  bookingNote:
    raw?.bookingNote ||
    'Based in Brantford and available for events throughout Southern Ontario.',
  travelDiscussNote:
    raw?.travelDiscussNote ||
    'Travel requirements can be discussed when confirming your event.',
}

export const SERVICE_AREA_BOOKING_CITIES = SERVICE_AREA.travelCities.join(' • ')

/** Schema.org Place / City / AdministrativeArea — no street address or geo coordinates. */
export function getServiceAreaSchemaPlaces() {
  const places = SERVICE_AREA.cities.map((name) => {
    if (name === 'Niagara Region' || name === 'Kitchener-Waterloo') {
      return { '@type': 'AdministrativeArea', name }
    }
    return { '@type': 'City', name }
  })
  places.push({ '@type': 'AdministrativeArea', name: SERVICE_AREA.basedInProvince })
  return places
}
