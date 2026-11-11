import { matchRoutes, useLocation } from "react-router-dom";
import { adminChristmasSnowfall, publicChristmasSnowfall } from "../configs/christmas";
import ChristmasSnowfall from "./ChristmasSnowfall";

export default function ApplicationSnowfall({ publicRoutes }) {
  const { pathname } = useLocation();
  const preset = matchRoutes(publicRoutes, pathname)
    ? publicChristmasSnowfall
    : adminChristmasSnowfall;

  return <ChristmasSnowfall {...preset} />;
}
