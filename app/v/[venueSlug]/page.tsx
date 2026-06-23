import VenueIssuePage from "@/app/issue/[venueSlug]/page";
export const dynamic = "force-dynamic";
export default function Page(props: any) { return <VenueIssuePage {...props} />; }
