import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Modal,
  StatusBar,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// ── API Base URL ──────────────────────────────────────────────────────────────
// เชื่อมต่อ Backend บนเซิร์ฟเวอร์มหาลัย (พอร์ต 3032) ที่ต่อกับ phpMyAdmin โดยตรง
const API_BASE = 'http://119.59.102.161:3032';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSalary(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

function showAlert(title, message) {
  if (Platform.OS === 'web') {
    window.alert(title ? `${title}: ${message}` : message);
  } else {
    Alert.alert(title, message);
  }
}

function showConfirm(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ยืนยัน', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

// ── Employee Card Component ────────────────────────────────────────────────────
function EmployeeCard({ emp, onToggleStatus, onEdit, onDelete }) {
  const isActive = emp.status === 'Active';
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{emp.name}</Text>
          <Text style={styles.cardPosition}>{emp.position}</Text>
        </View>
        <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusLeave]}>
          <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextLeave]}>
            {isActive ? '● Active' : '○ On Leave'}
          </Text>
        </View>
      </View>

      <View style={styles.cardSalaryRow}>
        <Text style={styles.cardSalaryLabel}>เงินเดือน</Text>
        <Text style={styles.cardSalary}>{formatSalary(emp.salary)}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => onEdit(emp)}
          activeOpacity={0.8}
        >
          <Text style={styles.editBtnText}>✏️ แก้ไข</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.toggleBtn]}
          onPress={() => onToggleStatus(emp.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.toggleBtnText}>
            {isActive ? '⏸ ลาหยุด' : '▶ ทำงาน'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.deleteBtn]}
          onPress={() =>
            showConfirm(
              'ลบพนักงาน',
              `ต้องการลบ "${emp.name}" ออกจากระบบใช่ไหม?`,
              () => onDelete(emp.id)
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.deleteBtnText}>🗑 ลบ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Cluster Card Component ─────────────────────────────────────────────────────
function ClusterCard({ cluster, index }) {
  const colors = ['#6366f1', '#10b981', '#f59e0b'];
  const icons = ['🥉', '🥈', '🥇'];
  const color = colors[index] || '#6366f1';
  const icon = icons[index] || '🏷️';
  return (
    <View style={[styles.clusterCard, { borderColor: color }]}>
      <View style={styles.clusterHeader}>
        <Text style={styles.clusterIcon}>{icon}</Text>
        <Text style={[styles.clusterGroup, { color }]}>{cluster.group}</Text>
        <View style={[styles.clusterCountBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.clusterCount, { color }]}>{cluster.count} คน</Text>
        </View>
      </View>
      <Text style={styles.clusterCentroidLabel}>ค่าเฉลี่ยเงินเดือน</Text>
      <Text style={[styles.clusterCentroid, { color }]}>{formatSalary(cluster.centroid)}</Text>
      {cluster.members && cluster.members.length > 0 && (
        <View style={styles.clusterMembers}>
          {cluster.members.map((m) => (
            <Text key={m.id} style={styles.clusterMember}>• {m.name} ({formatSalary(m.salary)})</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Add form
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPosition, setAddPosition] = useState('');
  const [addSalary, setAddSalary] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit form
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Clustering
  const [clusters, setClusters] = useState(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterError, setClusterError] = useState('');
  const [showClusters, setShowClusters] = useState(false);

  // ── Load user info ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadUser();
    fetchEmployees();
  }, []);

  async function loadUser() {
    try {
      const raw = await AsyncStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }

  // ── Fetch Employees ────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/employees`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmployees(data);
        setError('');
      }
    } catch {
      setError('ไม่สามารถดึงข้อมูลพนักงานได้ — ตรวจสอบการเชื่อมต่อ Backend');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  // ── Add Employee ───────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const n = addName.trim();
    const pos = addPosition.trim();
    const sal = addSalary.trim();

    if (!n || !pos || !sal) {
      setAddError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (isNaN(Number(sal)) || Number(sal) <= 0) {
      setAddError('เงินเดือนต้องเป็นตัวเลขที่มากกว่า 0');
      return;
    }

    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, position: pos, salary: Number(sal) }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setEmployees((prev) => [...prev, data]);
        setShowAddModal(false);
        setAddName(''); setAddPosition(''); setAddSalary('');
        setClusters(null); // reset clusters เมื่อข้อมูลเปลี่ยน
      } else {
        setAddError(data.error || 'ไม่สามารถเพิ่มพนักงานได้');
      }
    } catch {
      setAddError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Edit Employee ──────────────────────────────────────────────────────────
  const handleOpenEdit = (emp) => {
    setEditId(emp.id);
    setEditName(emp.name);
    setEditPosition(emp.position);
    setEditSalary(String(emp.salary));
    setEditStatus(emp.status);
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    const n = editName.trim();
    const pos = editPosition.trim();
    const sal = editSalary.trim();

    if (!n || !pos || !sal) {
      setEditError('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }
    if (isNaN(Number(sal)) || Number(sal) <= 0) {
      setEditError('เงินเดือนต้องเป็นตัวเลขที่มากกว่า 0');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE}/api/employees/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, position: pos, salary: Number(sal), status: editStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) => prev.map((e) => (e.id === editId ? data : e)));
        setShowEditModal(false);
        setClusters(null); // reset clusters เพื่อคำนวณใหม่
      } else {
        setEditError(data.error || 'ไม่สามารถแก้ไขข้อมูลได้');
      }
    } catch {
      setEditError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Toggle Status ──────────────────────────────────────────────────────────
  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/employees/${id}/status`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        setEmployees((prev) => prev.map((e) => (e.id === id ? data : e)));
        setClusters(null);
      }
    } catch {
      showAlert('Error', 'ไม่สามารถอัปเดตสถานะได้');
    }
  };

  // ── Delete Employee ────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e.id !== id));
        setClusters(null);
      }
    } catch {
      showAlert('Error', 'ไม่สามารถลบพนักงานได้');
    }
  };

  // ── Salary Clustering (Phase 2) ────────────────────────────────────────────
  const handleAnalyze = async () => {
    setClusterLoading(true);
    setClusterError('');
    setShowClusters(true);
    try {
      const res = await fetch(`${API_BASE}/api/employees/salary-clusters`);
      const data = await res.json();
      if (data.success) {
        setClusters(data.clusters);
      } else {
        setClusterError('ไม่สามารถวิเคราะห์ข้อมูลได้');
      }
    } catch {
      setClusterError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setClusterLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    showConfirm('ออกจากระบบ', 'ต้องการออกจากระบบใช่ไหม?', async () => {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.warn('AsyncStorage remove error:', e);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('token');
          window.localStorage.removeItem('user');
        } catch {}
      }
      router.replace('/login');
    });
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const leaveCount = employees.filter((e) => e.status === 'On Leave').length;
  const avgSalary = employees.length > 0
    ? Math.round(employees.reduce((s, e) => s + e.salary, 0) / employees.length)
    : 0;

  // ── Filtered Employees (Search) ─────────────────────────────────────────────
  const filteredEmployees = employees.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (e.name && e.name.toLowerCase().includes(q)) ||
      (e.position && e.position.toLowerCase().includes(q)) ||
      (e.status && e.status.toLowerCase().includes(q)) ||
      String(e.salary).includes(q)
    );
  });

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerTitle}>👥 HR Manager</Text>
            <Text style={styles.headerSub}>
              {user ? `สวัสดี, ${user.username}` : 'Dashboard'}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>ออกจากระบบ</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: '#6366f1' }]}>
            <Text style={styles.statNum}>{employees.length}</Text>
            <Text style={styles.statLabel}>พนักงานทั้งหมด</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#10b981' }]}>
            <Text style={[styles.statNum, { color: '#10b981' }]}>{activeCount}</Text>
            <Text style={styles.statLabel}>กำลังทำงาน</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#f59e0b' }]}>
            <Text style={[styles.statNum, { color: '#f59e0b' }]}>{leaveCount}</Text>
            <Text style={styles.statLabel}>ลาหยุด</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#a78bfa' }]}>
            <Text style={[styles.statNum, { color: '#a78bfa', fontSize: 15 }]}>{formatSalary(avgSalary)}</Text>
            <Text style={styles.statLabel}>เฉลี่ยเงินเดือน</Text>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>＋ เพิ่มพนักงาน</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.analyzeBtn, clusterLoading && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={clusterLoading}
            activeOpacity={0.8}
          >
            {clusterLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.analyzeBtnText}>📊 วิเคราะห์ Salary</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Salary Clustering Results (Phase 2) ── */}
        {showClusters && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📊 Salary Clustering (K-Means, k=3)</Text>
              <TouchableOpacity onPress={() => { setShowClusters(false); setClusters(null); }}>
                <Text style={styles.closeClusters}>✕ ปิด</Text>
              </TouchableOpacity>
            </View>

            {clusterLoading && (
              <View style={styles.clusterLoading}>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={styles.clusterLoadingText}>กำลังวิเคราะห์ข้อมูลเงินเดือน...</Text>
              </View>
            )}

            {!!clusterError && !clusterLoading && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {clusterError}</Text>
              </View>
            )}

            {clusters && !clusterLoading && clusters.map((cl, idx) => (
              <ClusterCard key={idx} cluster={cl} index={idx} />
            ))}
          </View>
        )}

        {/* ── Search Bar ── */}
        <View style={styles.searchSection}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาชื่อ, ตำแหน่ง, สถานะ หรือเงินเดือน..."
              placeholderTextColor="#5a5a7a"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Employee List ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              รายชื่อพนักงาน ({filteredEmployees.length}{searchQuery ? ` / ${employees.length}` : ''} คน)
            </Text>
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchLink}>ล้างคำค้นหา</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#6366f1" size="large" />
              <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
            </View>
          )}

          {!!error && !loading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchEmployees}>
                <Text style={styles.retryText}>ลองใหม่</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && filteredEmployees.map((emp) => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              onToggleStatus={handleToggleStatus}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          ))}

          {!loading && !error && filteredEmployees.length === 0 && employees.length > 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>ไม่พบพนักงานที่ค้นหา</Text>
              <Text style={styles.emptyHint}>ลองเปลี่ยนคำค้นหา หรือกด "ล้างคำค้นหา"</Text>
            </View>
          )}

          {!loading && !error && employees.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>ไม่มีข้อมูลพนักงาน</Text>
              <Text style={styles.emptyHint}>กด "เพิ่มพนักงาน" เพื่อเริ่มต้น</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Add Employee Modal ── */}
      <Modal visible={showAddModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>＋ เพิ่มพนักงานใหม่</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setAddError(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!addError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {addError}</Text>
              </View>
            )}

            <Text style={styles.label}>ชื่อ-นามสกุล *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น John Doe"
              placeholderTextColor="#4a4a6a"
              value={addName}
              onChangeText={(t) => { setAddName(t); setAddError(''); }}
            />

            <Text style={styles.label}>ตำแหน่งงาน *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น Software Engineer"
              placeholderTextColor="#4a4a6a"
              value={addPosition}
              onChangeText={(t) => { setAddPosition(t); setAddError(''); }}
            />

            <Text style={styles.label}>เงินเดือน (บาท) *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 45000"
              placeholderTextColor="#4a4a6a"
              value={addSalary}
              onChangeText={(t) => { setAddSalary(t); setAddError(''); }}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.submitBtn, addLoading && styles.submitBtnDisabled]}
              onPress={handleAdd}
              disabled={addLoading}
              activeOpacity={0.8}
            >
              {addLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>บันทึก</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit Employee Modal ── */}
      <Modal visible={showEditModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ แก้ไขข้อมูลพนักงาน</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditError(''); }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {!!editError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠️ {editError}</Text>
              </View>
            )}

            <Text style={styles.label}>ชื่อ-นามสกุล *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น John Doe"
              placeholderTextColor="#4a4a6a"
              value={editName}
              onChangeText={(t) => { setEditName(t); setEditError(''); }}
            />

            <Text style={styles.label}>ตำแหน่งงาน *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น Software Engineer"
              placeholderTextColor="#4a4a6a"
              value={editPosition}
              onChangeText={(t) => { setEditPosition(t); setEditError(''); }}
            />

            <Text style={styles.label}>เงินเดือน (บาท) *</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น 45000"
              placeholderTextColor="#4a4a6a"
              value={editSalary}
              onChangeText={(t) => { setEditSalary(t); setEditError(''); }}
              keyboardType="numeric"
            />

            <Text style={styles.label}>สถานะการทำงาน</Text>
            <View style={styles.statusSelectRow}>
              <TouchableOpacity
                style={[styles.statusSelectBtn, editStatus === 'Active' && styles.statusSelectActive]}
                onPress={() => setEditStatus('Active')}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusSelectText, editStatus === 'Active' && styles.statusSelectTextActive]}>
                  ● Active (กำลังทำงาน)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusSelectBtn, editStatus === 'On Leave' && styles.statusSelectLeave]}
                onPress={() => setEditStatus('On Leave')}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusSelectText, editStatus === 'On Leave' && styles.statusSelectTextLeave]}>
                  ○ On Leave (ลาหยุด)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, styles.editSubmitBtn, editLoading && styles.submitBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={editLoading}
              activeOpacity={0.8}
            >
              {editLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.submitBtnText}>บันทึกการแก้ไข</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#0f0f1a' },

  // Header
  header: {
    backgroundColor: '#16162a',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 18 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerInner: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 12, color: '#6366f1', marginTop: 2 },
  logoutBtn: {
    backgroundColor: '#1e1e3a', borderRadius: 10, borderWidth: 1, borderColor: '#3a3a5a',
    paddingVertical: 8, paddingHorizontal: 14,
  },
  logoutText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Scroll Container
  scrollContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingBottom: 40,
  },

  // Stats
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#16162a',
    borderRadius: 14, borderWidth: 1,
    padding: 14, alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '800', color: '#6366f1' },
  statLabel: { fontSize: 10, color: '#6a6a8a', marginTop: 4, textAlign: 'center' },

  // Actions
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  addBtn: {
    flex: 1, backgroundColor: '#6366f1',
    borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  analyzeBtn: {
    flex: 1, backgroundColor: '#0f766e',
    borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },
  analyzeBtnDisabled: { backgroundColor: '#1a3a38', shadowOpacity: 0 },
  analyzeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Section
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  closeClusters: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Employee Card
  card: {
    backgroundColor: '#16162a', borderRadius: 16,
    borderWidth: 1, borderColor: '#2a2a4a',
    padding: 16, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#6366f1',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  cardPosition: { fontSize: 12, color: '#8a8aaa', marginTop: 2 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1 },
  statusActive: { backgroundColor: '#06302a', borderColor: '#10b981' },
  statusLeave: { backgroundColor: '#3a2005', borderColor: '#f59e0b' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statusTextActive: { color: '#10b981' },
  statusTextLeave: { color: '#f59e0b' },
  cardSalaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#0f0f1a', borderRadius: 10, padding: 12, marginBottom: 12,
  },
  cardSalaryLabel: { fontSize: 12, color: '#6a6a8a' },
  cardSalary: { fontSize: 16, fontWeight: '800', color: '#a78bfa' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  toggleBtn: { backgroundColor: '#1e1e3a', borderWidth: 1, borderColor: '#3a3a6a' },
  toggleBtnText: { color: '#a0a0e0', fontSize: 13, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#2d1515', borderWidth: 1, borderColor: '#7f1d1d' },
  deleteBtnText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },

  // Cluster Card
  clusterCard: {
    backgroundColor: '#16162a', borderRadius: 16,
    borderWidth: 1, padding: 16, marginBottom: 12,
  },
  clusterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  clusterIcon: { fontSize: 20 },
  clusterGroup: { fontSize: 16, fontWeight: '800', flex: 1 },
  clusterCountBadge: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 20 },
  clusterCount: { fontSize: 12, fontWeight: '700' },
  clusterCentroidLabel: { fontSize: 11, color: '#6a6a8a' },
  clusterCentroid: { fontSize: 22, fontWeight: '800', marginTop: 2, marginBottom: 10 },
  clusterMembers: { borderTopWidth: 1, borderTopColor: '#2a2a4a', paddingTop: 10 },
  clusterMember: { fontSize: 12, color: '#8a8aaa', lineHeight: 22 },
  clusterLoading: { alignItems: 'center', paddingVertical: 24 },
  clusterLoadingText: { color: '#6a6a8a', marginTop: 12, fontSize: 13 },

  // Loading/Error/Empty
  centerBox: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#6a6a8a', marginTop: 12, fontSize: 13 },
  errorBox: {
    backgroundColor: '#2d1515', borderRadius: 12,
    borderWidth: 1, borderColor: '#7f1d1d',
    padding: 14, marginBottom: 12, alignItems: 'center',
  },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  retryBtn: {
    marginTop: 10, backgroundColor: '#7f1d1d',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 20,
  },
  retryText: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },
  emptyBox: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginTop: 12 },
  emptyHint: { color: '#6a6a8a', fontSize: 13, marginTop: 6 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: Platform.OS === 'web' ? 'center' : 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : 'stretch',
    padding: Platform.OS === 'web' ? 20 : 0,
  },
  modalCard: {
    backgroundColor: '#16162a',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#2a2a4a',
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  modalClose: { fontSize: 18, color: '#6a6a8a', fontWeight: '700' },

  // Form
  label: { fontSize: 13, fontWeight: '600', color: '#a0a0c0', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#0f0f1a',
    borderRadius: 12, borderWidth: 1, borderColor: '#2a2a4a',
    color: '#ffffff', fontSize: 15,
    paddingHorizontal: 16, height: 50,
  },
  // Search Section
  searchSection: { paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#16162a', borderRadius: 12,
    borderWidth: 1, borderColor: '#2a2a4a',
    paddingHorizontal: 14, height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: '#ffffff', fontSize: 14 },
  searchClearBtn: { padding: 4 },
  searchClearText: { color: '#6a6a8a', fontSize: 14, fontWeight: '700' },
  clearSearchLink: { color: '#6366f1', fontSize: 12, fontWeight: '600', marginBottom: 12 },

  // Edit Button in card
  editBtn: { backgroundColor: '#13233a', borderWidth: 1, borderColor: '#1d4ed8' },
  editBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },

  // Status Selector in Edit Modal
  statusSelectRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  statusSelectBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a4a', backgroundColor: '#0f0f1a',
    alignItems: 'center',
  },
  statusSelectActive: { borderColor: '#10b981', backgroundColor: '#06302a' },
  statusSelectLeave: { borderColor: '#f59e0b', backgroundColor: '#3a2005' },
  statusSelectText: { fontSize: 12, color: '#6a6a8a', fontWeight: '600' },
  statusSelectTextActive: { color: '#10b981' },
  statusSelectTextLeave: { color: '#f59e0b' },
  editSubmitBtn: { backgroundColor: '#2563eb' },
});
