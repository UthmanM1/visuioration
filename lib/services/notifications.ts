import { notifications } from "../demo-data";
import { demoResolve } from "./client";

export const notificationService = {
  list: () => demoResolve(notifications, 150),
};
