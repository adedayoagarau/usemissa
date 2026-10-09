// Google Picker owns its dialog. Access tokens exist only in memory for this picker session.
export type PickedDriveFile = { id: string; name: string };
type PickerData = { action: string; docs?: { id: string; name?: string }[] };
type PickerInstance = {
  setVisible: (visible: boolean) => void;
  dispose?: () => void;
};
type PickerBuilder = {
  setDeveloperKey: (key: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setOrigin: (origin: string) => PickerBuilder;
  addView: (view: unknown) => PickerBuilder;
  setCallback: (callback: (data: PickerData) => void) => PickerBuilder;
  build: () => PickerInstance;
};
type GoogleApi = {
  picker: {
    PickerBuilder: new () => PickerBuilder;
    DocsView: new () => { setMimeTypes: (mime: string) => unknown };
  };
};
declare global {
  interface Window {
    gapi?: {
      load: (
        module: string,
        options: {
          callback: () => void;
          onerror: () => void;
          timeout: number;
          ontimeout: () => void;
        },
      ) => void;
    };
    google?: GoogleApi;
  }
}
let loading: Promise<void> | undefined;
function loadPicker() {
  if (window.google?.picker) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const run = () =>
      window.gapi?.load("picker", {
        callback: resolve,
        onerror: () => reject(new Error("Google Drive picker could not load.")),
        timeout: 15000,
        ontimeout: () => reject(new Error("Google Drive picker timed out.")),
      });
    if (window.gapi) return run();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = run;
    script.onerror = () =>
      reject(new Error("Google Drive picker could not load."));
    document.head.appendChild(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
export async function pickDriveFile(config: {
  accessToken: string;
  pickerKey: string;
  appId: string;
}): Promise<PickedDriveFile | null> {
  await loadPicker();
  const api = window.google!.picker;
  return new Promise((resolve) => {
    const view = new api.DocsView().setMimeTypes(
      "application/vnd.google-apps.document,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain",
    );
    const picker = new api.PickerBuilder()
      .setDeveloperKey(config.pickerKey)
      .setAppId(config.appId)
      .setOAuthToken(config.accessToken)
      .setOrigin(location.origin)
      .addView(view)
      .setCallback((data) => {
        if (data.action === "picked" || data.action === "cancel") {
          picker.setVisible(false);
          picker.dispose?.();
          const file = data.docs?.[0];
          resolve(
            data.action === "picked" && file
              ? { id: file.id, name: file.name ?? "Imported writing" }
              : null,
          );
        }
      })
      .build();
    picker.setVisible(true);
  });
}
