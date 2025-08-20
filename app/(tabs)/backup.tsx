import { ActivityIndicator, Alert, Clipboard, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { auth, database } from "@/app/services/firebase";
import LoginScreen from "@/components/LoginScreen";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";

export default function BackupScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [currentExp, setCurrentExp] = useState<number | null>(null);
  const [taskTimes, setTaskTimes] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      if (user) {
        fetchUserData(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    setIsLoading(true);
    try {
      // Buscar apenas dados de gamificação
      const gamificationRef = ref(database, `gamificationUserData/${uid}`);
      const gamificationSnapshot = await get(gamificationRef);
      const gamificationData = gamificationSnapshot.exists() ? gamificationSnapshot.val() : {};

      // Estruturar os dados incluindo o ID do usuário
      const completeData = {
        "gamificationUserData": {
          [uid]: gamificationData
        }
      };

      setBackupData(completeData);
      
      // Extrair informações específicas para exibição
      if (gamificationData) {
        setUserLevel(gamificationData.userLevel || 0);
        setCurrentExp(gamificationData.currentExp || 0);
        
        // Extrair tempos acumulados de cada tarefa
        const times: {[key: string]: string} = {};
        Object.keys(gamificationData).forEach(key => {
          if (gamificationData[key] && 
              typeof gamificationData[key] === 'object' && 
              gamificationData[key].totalTimeTracked) {
            times[key] = gamificationData[key].totalTimeTracked;
          }
        });
        setTaskTimes(times);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados do Firebase.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!backupData) {
      Alert.alert("Erro", "Nenhum dado disponível para copiar.");
      return;
    }

    Clipboard.setString(JSON.stringify(backupData, null, 2));
    Alert.alert("Sucesso", "JSON copiado para a área de transferência!");
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    if (auth.currentUser) {
      fetchUserData(auth.currentUser.uid);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#E8E8E8", dark: "#2C2C2C" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#4CAF50"
          name="arrow.clockwise.icloud.fill"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Backup Geral</ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        Aqui você pode fazer o backup completo dos seus dados de gamificação no Firebase.
        Abaixo você pode ver um resumo dos seus dados e copiar o JSON completo.
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      ) : backupData && userLevel !== null ? (
        <>
          <ThemedView style={styles.infoContainer}>
            <ThemedText style={styles.infoTitle}>Seu nível é:</ThemedText>
            <ThemedText style={styles.infoValue}>{userLevel}</ThemedText>
            
            <ThemedText style={styles.infoTitle}>Sua experiência é:</ThemedText>
            <ThemedText style={styles.infoValue}>{currentExp ? currentExp.toFixed(2) : '0'}</ThemedText>
            
            <ThemedText style={styles.infoTitle}>Tempo gasto acumulado nas tarefas:</ThemedText>
            {Object.keys(taskTimes).length > 0 ? (
              Object.keys(taskTimes).map((taskName) => {
                // Só exibir tarefas que têm tempo acumulado e não são objetos de controle
                if (taskTimes[taskName] && 
                    !['currentExp', 'userLevel', 'dailyTaskUsage', 'dailyTimeSpent', 'fallDates', 'vidasData'].includes(taskName)) {
                  return (
                    <ThemedView key={taskName} style={styles.taskItem}>
                      <ThemedText style={styles.taskName}>{taskName}:</ThemedText>
                      <ThemedText style={styles.taskTime}>{taskTimes[taskName]}</ThemedText>
                    </ThemedView>
                  );
                }
                return null;
              })
            ) : (
              <ThemedText style={styles.noTasksText}>Nenhuma tarefa registrada ainda.</ThemedText>
            )}
          </ThemedView>
          
          <TouchableOpacity 
            style={styles.copyButton} 
            onPress={copyToClipboard}
            disabled={!backupData}
          >
            <ThemedText style={styles.copyButtonText}>
              COPIAR JSON
            </ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <ThemedView style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>Sem nada para exibir aqui agora, tente mais tarde.</ThemedText>
        </ThemedView>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  description: {
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  infoContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 18,
    marginBottom: 16,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  taskName: {
    fontSize: 14,
  },
  taskTime: {
    fontSize: 14,
    fontWeight: "bold",
  },
  copyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 24,
  },
  copyButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  loader: {
    marginVertical: 24,
  },
  noDataContainer: {
    marginHorizontal: 16,
    marginVertical: 32,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    color: "#757575",
  },
  noTasksText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 8,
    color: "#757575",
  },
});
