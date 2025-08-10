import { auth } from "@/app/services/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";

export const clearCredentials = async () => {
  await AsyncStorage.removeItem("@saved_email");
  await AsyncStorage.removeItem("@saved_password");

  await signOut(auth);
};
