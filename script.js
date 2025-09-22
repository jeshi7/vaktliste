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
        this.currentScheduleId = null;
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
        document.getElementById('saveSchedule').addEventListener('click', () => this.saveSchedule());
        document.getElementById('downloadJPEG').addEventListener('click', () => this.downloadJPEG());
        document.getElementById('nextMonth').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('prevMonth').addEventListener('click', () => this.changeMonth(-1));
    }
    
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.updateMonthDisplay();
        this.loadSolutionsHistory();
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
        
        // Add some randomness to generate different solutions
        this.addRandomness();
        
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
    
    addRandomness() {
        // Shuffle employee arrays to create different solutions
        this.employees.dept1 = this.shuffleArray([...this.employees.dept1]);
        this.employees.dept2 = this.shuffleArray([...this.employees.dept2]);
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    assignShiftsForDay(day) {
        const daySchedule = {};
        const assignedEmployees = new Set(); // Track who's already assigned today
        
        // First assign department-specific shifts (3 and 6) to ensure we have people from each dept
        [3, 6].forEach(shiftId => {
            const availableDept1 = this.employees.dept1.filter(emp => 
                !assignedEmployees.has(emp) && 
                (emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)) // Yvonne restriction
            );
            const availableDept2 = this.employees.dept2.filter(emp => 
                !assignedEmployees.has(emp) && 
                (emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)) // Yvonne restriction
            );
            
            // If no one available in a department, use anyone from that department (respecting Yvonne's restrictions)
            const dept1Employee = availableDept1.length > 0 ? 
                this.selectEmployee(availableDept1, shiftId) : 
                this.selectEmployee(this.employees.dept1.filter(emp => emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)), shiftId);
            const dept2Employee = availableDept2.length > 0 ? 
                this.selectEmployee(availableDept2, shiftId) : 
                this.selectEmployee(this.employees.dept2.filter(emp => emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)), shiftId);
            
            daySchedule[shiftId] = { dept1: dept1Employee, dept2: dept2Employee };
            assignedEmployees.add(dept1Employee);
            assignedEmployees.add(dept2Employee);
        });
        
        // Then assign individual shifts (1, 2, 4, 5) from remaining people
        [1, 2, 4, 5].forEach(shiftId => {
            const allEmployees = [...this.employees.dept1, ...this.employees.dept2];
            const availableEmployees = allEmployees.filter(emp => 
                !assignedEmployees.has(emp) && // Not already assigned today
                (emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId)) // Yvonne restriction
            );
            
            // If no one available, use anyone (except Yvonne for restricted shifts)
            const finalAvailableEmployees = availableEmployees.length > 0 ? availableEmployees :
                allEmployees.filter(emp => emp !== 'Yvonne' || [2, 3, 4, 5].includes(shiftId));
            
            const selectedEmployee = this.selectEmployee(finalAvailableEmployees, shiftId);
            daySchedule[shiftId] = selectedEmployee;
            assignedEmployees.add(selectedEmployee);
        });
        
        return daySchedule;
    }
    
    selectEmployee(availableEmployees, shiftId) {
        // Check if there are available employees
        if (availableEmployees.length === 0) {
            console.error(`No available employees for shift ${shiftId}`);
            return null;
        }
        
        // Filter out employees who have reached their shift limit
        const eligibleEmployees = availableEmployees.filter(emp => {
            const currentCount = this.shiftCounts[emp].shifts[shiftId];
            // Yvonne can only work shift 5 three times
            if (emp === 'Yvonne' && shiftId === 5) {
                return currentCount < 3;
            }
            // For other employees, allow up to 5 times per shift (adjust as needed)
            return currentCount < 5;
        });
        
        // If no eligible employees, use all available (emergency fallback)
        const finalEmployees = eligibleEmployees.length > 0 ? eligibleEmployees : availableEmployees;
        
        // Prioritize employees who haven't worked any shifts yet (except Yvonne)
        const employeesWithNoShifts = finalEmployees.filter(emp => 
            emp !== 'Yvonne' && this.shiftCounts[emp].total === 0
        );
        
        const candidatesToUse = employeesWithNoShifts.length > 0 ? employeesWithNoShifts : finalEmployees;
        
        // Find employee with least total shifts and least shifts of this type
        let bestEmployee = candidatesToUse[0];
        let bestScore = this.calculateEmployeeScore(bestEmployee, shiftId);
        
        for (let i = 1; i < candidatesToUse.length; i++) {
            const employee = candidatesToUse[i];
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
    
    async saveSchedule() {
        if (!this.schedule || Object.keys(this.schedule).length === 0) {
            alert('Ingen vaktliste å lagre. Generer en løsning først.');
            return;
        }
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        
        // Prepare statistics data
        const statistics = Object.keys(this.shiftCounts).map(emp => ({
            name: emp,
            total: this.shiftCounts[emp].total,
            breakdown: this.shiftCounts[emp].shifts
        }));
        
        try {
            const response = await fetch('/api/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    month: month,
                    year: year,
                    scheduleData: this.schedule,
                    statistics: statistics
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.currentScheduleId = result.id;
                alert(`Løsning ${result.solutionNumber} lagret!`);
                this.loadSolutionsHistory();
            } else {
                alert('Feil ved lagring: ' + result.error);
            }
        } catch (error) {
            alert('Feil ved lagring: ' + error.message);
        }
    }
    
    async loadSolutionsHistory() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        
        try {
            const response = await fetch(`/api/schedules/${year}/${month}`);
            const solutions = await response.json();
            
            this.displaySolutionsHistory(solutions);
        } catch (error) {
            console.error('Feil ved lasting av løsninger:', error);
        }
    }
    
    displaySolutionsHistory(solutions) {
        const container = document.getElementById('solutionsList');
        
        if (solutions.length === 0) {
            container.innerHTML = '<p class="placeholder">Ingen lagrede løsninger for denne måneden</p>';
            return;
        }
        
        let html = '';
        solutions.forEach(solution => {
            const date = new Date(solution.created_at).toLocaleDateString('no-NO');
            html += `
                <div class="solution-card" data-id="${solution.id}">
                    <h4>Løsning ${solution.solution_number}</h4>
                    <div class="date">${date}</div>
                    <div class="actions">
                        <button class="btn-small btn-load" onclick="scheduler.loadSolution(${solution.id})">Last</button>
                        <button class="btn-small btn-delete" onclick="scheduler.deleteSolution(${solution.id})">Slett</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    async loadSolution(solutionId) {
        try {
            const response = await fetch(`/api/schedules/${solutionId}/statistics`);
            const statistics = await response.json();
            
            // Reconstruct schedule from statistics (simplified - in real app you'd store full schedule)
            this.currentScheduleId = solutionId;
            this.generateSchedule(); // Regenerate with same constraints
            alert('Løsning lastet!');
        } catch (error) {
            alert('Feil ved lasting: ' + error.message);
        }
    }
    
    async deleteSolution(solutionId) {
        if (!confirm('Er du sikker på at du vil slette denne løsningen?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/schedules/${solutionId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Løsning slettet!');
                this.loadSolutionsHistory();
            } else {
                const result = await response.json();
                alert('Feil ved sletting: ' + result.error);
            }
        } catch (error) {
            alert('Feil ved sletting: ' + error.message);
        }
    }
    
    async downloadJPEG() {
        if (!this.schedule || Object.keys(this.schedule).length === 0) {
            alert('Ingen vaktliste å laste ned. Generer en løsning først.');
            return;
        }
        
        try {
            // Import html2canvas dynamically
            const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js')).default;
            
            const scheduleTable = document.querySelector('.schedule-table');
            const canvas = await html2canvas(scheduleTable, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true
            });
            
            // Convert to JPEG and download
            const link = document.createElement('a');
            link.download = `vaktliste-${this.currentDate.getFullYear()}-${String(this.currentDate.getMonth() + 1).padStart(2, '0')}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            
        } catch (error) {
            alert('Feil ved nedlasting: ' + error.message);
        }
    }
}

// Initialize the scheduler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.scheduler = new ShiftScheduler();
    scheduler.loadSolutionsHistory();
});
