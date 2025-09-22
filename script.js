class ShiftScheduler {
    constructor() {
        this.employees = {
            dept1: ['Yvonne', 'Luma', 'Lissa', 'Michelle'],
            dept2: ['Camilla', 'Grete', 'Ida', 'Josephine']
        };
        
        this.shifts = {
            1: { time: '07:00', description: 'Vakt 1', alternating: true, partner: 2, count: 1 },
            2: { time: '07:15', description: 'Vakt 2', alternating: true, partner: 1, count: 1 },
            3: { time: '08:00', description: 'Vakt 3', alternating: false, count: 2, deptSpecific: true },
            4: { time: '08:30', description: 'Vakt 4', alternating: true, partner: 5, count: 1 },
            5: { time: '09:00', description: 'Vakt 5', alternating: true, partner: 4, count: 1 },
            6: { time: '09:30', description: 'Vakt 6', alternating: false, count: 2, deptSpecific: true }
        };
        
        this.currentDate = new Date();
        this.schedule = {};
        this.shiftCounts = {};
        this.init();
    }
    
    init() {
        this.initializeShiftCounts();
        this.setupEventListeners();
        this.updateMonthDisplay();
    }
    
    initializeShiftCounts() {
        const allEmployees = [...this.employees.dept1, ...this.employees.dept2];
        this.shiftCounts = {};
        allEmployees.forEach(emp => {
            this.shiftCounts[emp] = { total: 0, shifts: {} };
            Object.keys(this.shifts).forEach(shiftId => {
                this.shiftCounts[emp].shifts[shiftId] = 0;
            });
        });
    }
    
    setupEventListeners() {
        document.getElementById('generateSchedule').addEventListener('click', () => this.generateSchedule());
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
    }
    
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.updateMonthDisplay();
        this.generateSchedule();
    }
    
    updateMonthDisplay() {
        const monthNames = [
            'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
        ];
        const month = monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        document.getElementById('currentMonth').textContent = `${month} ${year}`;
    }
    
    generateSchedule() {
        this.initializeShiftCounts();
        this.schedule = {};
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Generate schedule for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
            
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                this.schedule[day] = { isWeekend: true };
                continue;
            }
            
            this.schedule[day] = this.assignShiftsForDay(day);
        }
        
        this.displaySchedule();
        this.displayStatistics();
    }
    
    assignShiftsForDay(day) {
        const daySchedule = {};
        const assignedEmployees = new Set(); // Track who's already assigned today
        
        // ALWAYS assign ALL 6 shifts every working day
        // Shifts 1, 2, 4, 5: Single person from any department
        [1, 2, 4, 5].forEach(shiftId => {
            const allEmployees = [...this.employees.dept1, ...this.employees.dept2];
            const availableEmployees = allEmployees.filter(emp => 
                !assignedEmployees.has(emp) && // Not already assigned today
                (emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)) // Yvonne restriction
            );
            const selectedEmployee = this.selectEmployee(availableEmployees, shiftId);
            daySchedule[shiftId] = selectedEmployee;
            assignedEmployees.add(selectedEmployee);
        });
        
        // Shifts 3 and 6: One person from each department
        [3, 6].forEach(shiftId => {
            const availableDept1 = this.employees.dept1.filter(emp => !assignedEmployees.has(emp));
            const availableDept2 = this.employees.dept2.filter(emp => !assignedEmployees.has(emp));
            
            const dept1Employee = this.selectEmployee(availableDept1, shiftId);
            const dept2Employee = this.selectEmployee(availableDept2, shiftId);
            
            daySchedule[shiftId] = { dept1: dept1Employee, dept2: dept2Employee };
            assignedEmployees.add(dept1Employee);
            assignedEmployees.add(dept2Employee);
        });
        
        return daySchedule;
    }
    
    selectEmployee(availableEmployees, shiftId) {
        // Find employee with least total shifts and least shifts of this type
        let bestEmployee = availableEmployees[0];
        let bestScore = this.calculateEmployeeScore(bestEmployee, shiftId);
        
        for (let i = 1; i < availableEmployees.length; i++) {
            const employee = availableEmployees[i];
            const score = this.calculateEmployeeScore(employee, shiftId);
            if (score < bestScore) {
                bestEmployee = employee;
                bestScore = score;
            }
        }
        
        // Update counts
        this.shiftCounts[bestEmployee].total++;
        this.shiftCounts[bestEmployee].shifts[shiftId]++;
        
        return bestEmployee;
    }
    
    calculateEmployeeScore(employee, shiftId) {
        const totalShifts = this.shiftCounts[employee].total;
        const shiftSpecificCount = this.shiftCounts[employee].shifts[shiftId];
        
        // Weight total shifts more heavily, but also consider shift-specific balance
        return totalShifts * 10 + shiftSpecificCount * 5;
    }
    
    displaySchedule() {
        const scheduleTable = document.getElementById('scheduleTable');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let html = '<table><thead><tr><th>Dag</th>';
        
        // Add shift headers
        Object.keys(this.shifts).forEach(shiftId => {
            const shift = this.shifts[shiftId];
            html += `<th>${shift.time}<br>${shift.description}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Add rows for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            html += `<tr><td class="${isWeekend ? 'weekend' : ''}">${day}<br>${this.getDayName(dayOfWeek)}</td>`;
            
            if (isWeekend) {
                // Weekend cells
                Object.keys(this.shifts).forEach(() => {
                    html += '<td class="weekend">Helg</td>';
                });
            } else {
                const daySchedule = this.schedule[day];
                
                Object.keys(this.shifts).forEach(shiftId => {
                    const shiftIdNum = parseInt(shiftId);
                    let cellContent = '';
                    let cellClass = `shift-cell shift-${shiftIdNum}`;
                    
                    if (daySchedule[shiftIdNum]) {
                        if (typeof daySchedule[shiftIdNum] === 'object') {
                            // Department-specific shift
                            cellContent = `${daySchedule[shiftIdNum].dept1}<br>${daySchedule[shiftIdNum].dept2}`;
                        } else {
                            // Single employee shift
                            cellContent = daySchedule[shiftIdNum];
                        }
                    }
                    
                    html += `<td class="${cellClass}">${cellContent}</td>`;
                });
            }
            
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        scheduleTable.innerHTML = html;
    }
    
    getDayName(dayOfWeek) {
        const days = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
        return days[dayOfWeek];
    }
    
    displayStatistics() {
        const statsContainer = document.getElementById('statistics');
        let html = '';
        
        // Calculate total shifts per employee
        const allEmployees = [...this.employees.dept1, ...this.employees.dept2];
        
        allEmployees.forEach(employee => {
            const totalShifts = this.shiftCounts[employee].total;
            const shiftBreakdown = Object.keys(this.shifts).map(shiftId => {
                const count = this.shiftCounts[employee].shifts[shiftId];
                return count > 0 ? `Vakt ${shiftId}: ${count}` : '';
            }).filter(Boolean).join(', ');
            
            html += `
                <div class="stat-card">
                    <h4>${employee}</h4>
                    <div class="number">${totalShifts}</div>
                    <div class="label">Totalt antall vakter</div>
                    <div class="label" style="font-size: 0.8rem; margin-top: 5px;">${shiftBreakdown}</div>
                </div>
            `;
        });
        
        statsContainer.innerHTML = html;
    }
}

// Initialize the scheduler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ShiftScheduler();
});
