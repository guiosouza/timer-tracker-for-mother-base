import { auth, database, onAuthStateChanged } from "@/app/services/firebase";
import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LoginScreen from "../../components/LoginScreen";
import { clearCredentials } from "../utils/auth";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { get, ref, set } from "firebase/database";

// ---- Types ----
type TaskOption = { label: string; color: string };
type TaskData = {
  count: number;
  timeline: string[];
  totalTimeTracked: string;
  lastTimeSynced: string;
  timeWasUsed: boolean;
};

const STORAGE_KEY = "@tasks_data";
const TIMER_KEY = "@timer_start";

// --- Funções utilitárias ---
function nowISO() {
  return new Date().toISOString();
}

async function getLocalData() {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  return json ? JSON.parse(json) : {};
}

async function saveLocalData(data: any) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeTaskName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

async function saveTaskLocally(
  taskName: string,
  durationSeconds: number,
  start: string,
  end: string
) {
  const normalizedTaskName = normalizeTaskName(taskName);
  const data = await getLocalData();

  if (!data[normalizedTaskName]) {
    data[normalizedTaskName] = {
      count: 0,
      timeline: [],
      totalTimeTracked: "000:00",
      lastTimeSynced: "",
      timeWasUsed: false,
    } as TaskData;
  }

  const mins = Math.floor(durationSeconds / 60);
  const hrs = Math.floor(mins / 60);
  const duration = `${hrs.toString().padStart(3, "0")}:${(mins % 60)
    .toString()
    .padStart(2, "0")}`;

  const entry = `${duration} - de ${start} até ${end}`;
  data[normalizedTaskName].timeline.push(entry);
  if (data[normalizedTaskName].timeline.length > 20) {
    data[normalizedTaskName].timeline.shift();
  }

  const [h, m] = data[normalizedTaskName].totalTimeTracked
    .split(":")
    .map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  data[normalizedTaskName].totalTimeTracked = `${newH
    .toString()
    .padStart(3, "0")}:${newM.toString().padStart(2, "0")}`;

  data[normalizedTaskName].lastTimeSynced = nowISO();
  data[normalizedTaskName].timeWasUsed = false;

  await saveLocalData(data);
}

async function syncTasksWithFirebase() {
  if (!auth.currentUser) {
    Alert.alert("Erro", "Você precisa estar logado para sincronizar");
    return;
  }
  const uid = auth.currentUser.uid;
  const localData = await getLocalData();

  for (const taskName in localData) {
    const taskRef = ref(database, `gamificationUserData/${uid}/${taskName}`);
    const snap = await get(taskRef);

    const remote = snap.exists()
      ? snap.val()
      : { lastTimeSynced: "", timeWasUsed: false };

    const remoteLast = Date.parse(remote.lastTimeSynced);
    const localLast = Date.parse(localData[taskName].lastTimeSynced);

    if (remote.timeWasUsed) {
      if (localLast > remoteLast) {
        await set(taskRef, {
          ...localData[taskName],
          timeWasUsed: false,
        });
      } else {
        localData[taskName] = {
          ...localData[taskName],
          timeline: [],
          totalTimeTracked: "000:00",
          timeWasUsed: true,
        };
      }
      continue;
    }

    if (!remote.lastTimeSynced || localLast > remoteLast) {
      await set(taskRef, localData[taskName]);
    }
  }

  await saveLocalData(localData);
  Alert.alert("Sucesso", "Sincronização concluída!");
}

// --- Opções de Task ---
const options: TaskOption[] = [
  { label: "Grind", color: "#FFD700" },
  { label: "Exercícios", color: "#32CD32" },
  { label: "Exercícios (focado)", color: "#1E90FF" },
  { label: "Caminhada", color: "#FF6347" },
];

// --- Select Custom ---
function CustomSelect({
  selectedValue,
  onChange,
  isRunning,
}: {
  selectedValue: string;
  onChange: (value: string) => void;
  isRunning: boolean;
}) {
  const [modalVisible, setModalVisible] = useState(false);

  function tryOpen() {
    if (isRunning) {
      alert("Pause o timer antes de trocar de task!");
      return;
    }
    setModalVisible(true);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.selectButton, isRunning && { opacity: 0.5 }]}
        onPress={tryOpen}
      >
        <Text style={styles.selectText}>{selectedValue}</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    { backgroundColor: item.color + "20" },
                  ]}
                  onPress={() => {
                    onChange(item.label);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, { color: item.color }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function HomeScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>(options[0].label);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recupera login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Recupera timer ao abrir app
  useEffect(() => {
    async function checkIfRunning() {
      const startStr = await AsyncStorage.getItem(TIMER_KEY);
      if (startStr) {
        const start = parseInt(startStr, 10);
        setIsRunning(true);
        timerRef.current = setInterval(() => {
          const diff = Math.floor((Date.now() - start) / 1000);
          setSeconds(diff);
        }, 1000);
      }
    }
    checkIfRunning();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function formatTime(totalSeconds: number) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  async function startTimer() {
    const start = Date.now();
    await AsyncStorage.setItem(TIMER_KEY, String(start));
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000);
      setSeconds(diff);
    }, 1000);
  }

  async function stopTimer() {
    const startStr = await AsyncStorage.getItem(TIMER_KEY);
    const start = startStr ? parseInt(startStr, 10) : Date.now();
    const end = Date.now();

    const diffSeconds = Math.floor((end - start) / 1000);
    await saveTaskLocally(
      selectedTask.toLowerCase(),
      diffSeconds,
      new Date(start).toLocaleTimeString("pt-BR", { hour12: false }),
      new Date(end).toLocaleTimeString("pt-BR", { hour12: false })
    );

    if (timerRef.current) clearInterval(timerRef.current);
    await AsyncStorage.removeItem(TIMER_KEY);
    setIsRunning(false);
    setSeconds(0);
    Alert.alert("Salvo", "Sessão registrada localmente");
  }

  const selectedColor =
    options.find((opt) => opt.label === selectedTask)?.color || "#000";

  return isLoggedIn ? (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Selecione a Task</ThemedText>
        <CustomSelect
          selectedValue={selectedTask}
          onChange={setSelectedTask}
          isRunning={isRunning}
        />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Timer</ThemedText>
        <ThemedText
          style={{ fontSize: 38, fontWeight: "bold", color: selectedColor }}
        >
          {formatTime(seconds)}
        </ThemedText>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <TouchableOpacity
            style={[
              styles.bigButton,
              isRunning ? styles.stopButton : styles.startButton,
            ]}
            onPress={isRunning ? stopTimer : startTimer}
          >
            <Text style={styles.bigButtonText}>
              {isRunning ? "STOP" : "START"}
            </Text>
          </TouchableOpacity>
        </View>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={syncTasksWithFirebase}
          disabled={isRunning}
        >
          <Text
            style={[styles.smallButtonText, isRunning && styles.disabledText]}
          >
            Sincronizar
          </Text>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Button
          title="Logout"
          onPress={clearCredentials}
          color="red"
        />
      </ThemedView>
    </ParallaxScrollView>
  ) : (
    <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
  );
}

const styles = StyleSheet.create({
  titleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepContainer: { gap: 8, marginBottom: 8 },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  selectButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  selectText: { fontSize: 16, color: "#333" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    width: "80%",
    padding: 16,
    elevation: 5,
  },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  optionText: { fontSize: 16, fontWeight: "500" },
  cancelButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  cancelText: { textAlign: "center", fontWeight: "bold", color: "#555" },
  bigButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: "#4CAF50", // verde
  },
  stopButton: {
    backgroundColor: "#E53935", // vermelho
  },
  bigButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 20,
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#2196F3", // azul suave
    alignSelf: "flex-start",
    marginVertical: 10,
  },
  smallButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  disabledText: {
    color: "#999",
  },
});
