import { auth, database, onAuthStateChanged } from "@/app/services/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Safe area at top to avoid notification bar */}
      <View style={styles.safeAreaTop} />

      {/* Main CODEC Screen */}
      <LinearGradient
        colors={['#1a2a3a', '#0a1520']}
        style={styles.container}
      >
        <View style={styles.codecHeader}>
          <View style={styles.codecBorder}>
            <Text style={styles.codecHeaderText}>MOTHER BASE</Text>
            <Text style={styles.codecSubText}>TIMER TRACKER</Text>
          </View>
          
          {/* Logout Button below MOTHER BASE */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutConfirm(true)}
          >
            <Text style={styles.logoutButtonText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.codecScreen}>
          <View style={styles.codecContent}>
            <View style={styles.taskSection}>
              <Text style={styles.sectionTitle}>MISSION TYPE</Text>
              <CustomSelect
                selectedValue={selectedTask}
                onChange={setSelectedTask}
                isRunning={isRunning}
              />
            </View>

            <View style={styles.timerSection}>
              <Text style={styles.sectionTitle}>ELAPSED TIME</Text>
              <Text style={[styles.timerText, { color: selectedColor }]}>
                {formatTime(seconds)}
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    isRunning ? styles.stopButton : styles.startButton,
                  ]}
                  onPress={isRunning ? stopTimer : startTimer}
                >
                  <Text style={styles.actionButtonText}>
                    {isRunning ? "STOP" : "START"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.syncSection}>
              <TouchableOpacity
                style={[styles.syncButton, isRunning && styles.disabledButton]}
                onPress={syncTasksWithFirebase}
                disabled={isRunning}
              >
                <Text style={[styles.syncButtonText, isRunning && styles.disabledText]}>
                  SYNC DATA
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.codecFooter}>
          <Text style={styles.codecFooterText}>We're not junkyard hounds</Text>
          <Text style={styles.versionText}>v1.1.0</Text>
        </View>
      </LinearGradient>

      {/* Logout Confirmation Modal */}
      <Modal
        transparent
        visible={showLogoutConfirm}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutModal}>
            <Text style={styles.logoutModalTitle}>CODEC TRANSMISSION</Text>
            <Text style={styles.logoutModalText}>Are you sure you want to disconnect from Mother Base?</Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity 
                style={styles.logoutModalButton}
                onPress={() => setShowLogoutConfirm(false)}
              >
                <Text style={styles.logoutModalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.logoutModalButton, styles.logoutConfirmButton]}
                onPress={clearCredentials}
              >
                <Text style={styles.logoutModalButtonText}>CONFIRM</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  ) : (
    <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
  );
}

const styles = StyleSheet.create({
  safeAreaTop: {
    height: 30, // Altura para evitar a barra de notificações
    width: '100%',
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  logoutButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF0000',
    marginTop: 10,
    alignSelf: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  codecHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  codecBorder: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    padding: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  codecHeaderText: {
    color: '#4CAF50',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  codecSubText: {
    color: '#4CAF50',
    fontSize: 14,
    letterSpacing: 1,
  },
  codecScreen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  codecContent: {
    flex: 1,
  },
  taskSection: {
    marginBottom: 24,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  syncSection: {
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: 'monospace',
    marginBottom: 16,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  startButton: {
    backgroundColor: '#006400',
    borderColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#8B0000',
    borderColor: '#FF0000',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  syncButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 4,
    backgroundColor: '#1a3a5a',
    borderWidth: 1,
    borderColor: '#4169E1',
  },
  syncButtonText: {
    color: '#ADD8E6',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  codecFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  codecFooterText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  versionText: {
    color: '#4CAF50',
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModal: {
    width: '80%',
    backgroundColor: '#0a1520',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
  },
  logoutModalTitle: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  logoutModalText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  logoutModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: '#1a3a5a',
  },
  logoutConfirmButton: {
    backgroundColor: '#8B0000',
    borderColor: '#FF0000',
  },
  logoutModalButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Select styles
  selectButton: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  selectText: { 
    fontSize: 16, 
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#0a1520',
    borderRadius: 8,
    width: '80%',
    padding: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  option: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#4CAF50',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  optionText: { 
    fontSize: 16, 
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#8B0000',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  cancelText: { 
    textAlign: 'center', 
    fontWeight: 'bold', 
    color: '#FFFFFF' 
  },
});
