import { redirect } from "next/navigation";
import { getAllCitySlugs } from "@/data/cities";

export default function Home(): never {
  const [firstCity] = getAllCitySlugs();

  redirect(`/${firstCity}`);
}