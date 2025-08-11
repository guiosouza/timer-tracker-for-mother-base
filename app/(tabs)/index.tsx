import { auth, onAuthStateChanged } from "@/app/services/firebase";
import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
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

type TaskOption = { label: string; color: string };

const options: TaskOption[] = [
  { label: "Grind", color: "#FFD700" },
  { label: "Exercícios", color: "#32CD32" },
  { label: "Exercícios (focado)", color: "#1E90FF" },
  { label: "Caminhada", color: "#FF6347" },
];

// --- Componente Select Custom ---
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
        style={[
          styles.selectButton,
          isRunning && { opacity: 0.5 }, // visualmente desativa
        ]}
        onPress={tryOpen}
      >
        <Text style={styles.selectText}>{selectedValue}</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  function formatTime(totalSeconds: number) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function stopTimer() {
    setIsRunning(false);
    setSeconds(0);
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

      {/* Escolha da Task */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Selecione a Task</ThemedText>
        <CustomSelect
          selectedValue={selectedTask}
          onChange={setSelectedTask}
          isRunning={isRunning}
        />
      </ThemedView>

      {/* Timer */}
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Timer</ThemedText>
        <ThemedText
          style={{
            fontSize: 32,
            fontWeight: "bold",
            color: selectedColor,
          }}
        >
          {formatTime(seconds)}
        </ThemedText>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {!isRunning ? (
            <Button title="START" onPress={() => setIsRunning(true)} />
          ) : (
            <Button title="STOP" color="red" onPress={stopTimer} />
          )}
        </View>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <Button
          title="Limpar credenciais"
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
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
  selectText: {
    fontSize: 16,
    color: "#333",
  },
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
  option: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  cancelText: {
    textAlign: "center",
    fontWeight: "bold",
    color: "#555",
  },
});
