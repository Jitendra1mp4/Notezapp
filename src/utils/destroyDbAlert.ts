import { Platform } from "react-native";
import { getVaultStorageProvider } from "../services/vaultStorageProvider";
import { logout } from "../stores/slices/authSlice";
import { Alert } from "./alert";

const VaultStorageProvider = getVaultStorageProvider()

/**
 * Shows confirmation and destroys database if confirmed by the user
 * @param dispatch - accepts dispatch returned from useAppDispatch as useAppDispatch can not be invoked outside react component
 */
export const handleDestroy = async (dispatch:any) => {
  console.log("inside handleDestroy...");
  const message = "⚠️ Are you sure you want to destroy Database?\nYou'll loss all your journals and Everything will be reset.";
  const callReset = async () => {
    await VaultStorageProvider.clearAllData()
    // ResetStorage();
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
