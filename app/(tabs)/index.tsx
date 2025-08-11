import { auth, onAuthStateChanged } from "@/app/services/firebase";
import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import LoginScreen from "../../components/LoginScreen";
import { clearCredentials } from "../utils/auth";

type TaskOption = { label: string; color: string };

const options: TaskOption[] = [
  { label: "Grind", color: "#FFD700" }, // dourado
  { label: "Exercícios", color: "#32CD32" }, // verde limão
  { label: "Exercícios (focado)", color: "#1E90FF" }, // azul
  { label: "Caminhada", color: "#FF6347" }, // vermelho tomate
];

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
        <Picker
          selectedValue={selectedTask}
          onValueChange={(value: string) => setSelectedTask(value)}
        >
          {options.map((opt) => {
            return (
              // @ts-ignore
              <Picker.Item
                key={opt.label}
                label={opt.label}
                value={opt.label}
              />
            );
          })}
        </Picker>
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
});
