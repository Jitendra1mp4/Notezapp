import { Platform } from "react-native";
import { ResetStorage } from "../services/unifiedStorageService";
import { useAppDispatch } from "../stores/hooks";
import { logout } from "../stores/slices/authSlice";
import { Alert } from "./alert";

export const handleDestroy = async () => {
  console.log("reset calling...");
  const message = "⚠️ Are you sure you want to destroy Database?\nYou'll loss all your journals and Everything will be reset.";
  const dispatch = useAppDispatch();
  const callReset = async () => {
    await ResetStorage();
    dispatch(logout());
  };

  if (Platform.OS === "web") {
    const wantToReset = confirm(message);
    if (wantToReset) await callReset();
  } else {
    Alert.alert(
      "⚠️ Destroy Database?",
      message,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Yes",
          onPress: callReset,
        },
      ],
    );
  }
};
