document.getElementById('jobForm').addEventListener('submit', function(e) {
  e.preventDefault(); // Prevent the default form submission

  let valid = true;
  document.getElementById('titleError').textContent = '';
  document.getElementById('descError').textContent = '';
  document.getElementById('dateError').textContent = '';
  document.getElementById('linkError').textContent = '';
  
  
  const title = document.getElementById('jobTitle').value.trim();
  const description = document.getElementById('jobDescription').value.trim();
  const datePosted = document.getElementById('datePosted').value;
  const jobLink = document.getElementById('jobLink').value.trim();
  const expirationDate = document.getElementById('expirationDate').value;
  const experience = document.getElementById('experience').value;
  const skills = document.getElementById('skills').value.trim();
  const workType = document.getElementById('workType').value;
  const salary = document.getElementById('salary').value.trim();
  const benefits = document.getElementById('benefits').value.trim();

  
  if (title === '') {
    document.getElementById('titleError').textContent = 'Job title is required.';
    valid = false;
  }
  
  if (description.length < 20) {
    document.getElementById('descError').textContent = 'Job description should be at least 20 characters.';
    valid = false;
  }
  
  if (!datePosted) {
    document.getElementById('dateError').textContent = 'Date posted is required.';
    valid = false;
  }
  
  if (jobLink === '') {
    document.getElementById('linkError').textContent = 'Job link is required.';
    valid = false;
  } else {
    try {
      new URL(jobLink);
    } catch (err) {
      document.getElementById('linkError').textContent = 'Please enter a valid URL.';
      valid = false;
    }
  }
  
  if (!valid) {
    return; 
  }


  const payload = {
    job_id: title.toLowerCase().replace(/\s+/g, '-'), 
    title: title,
    description: description,
    date_posted: datePosted,
    job_link: jobLink,
    expiration_date: expirationDate,
    experience: experience,
    skills: skills,
    work_type: workType,
    salary: salary,
    benefits: benefits
  };


  const API_BASE_URL = "http://127.0.0.1:8000";

  fetch(`${API_BASE_URL}/job/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(response => response.json())
  .then(data => {
    console.log("Success:", data);
    alert("Job report submitted successfully!");
    document.getElementById('jobForm').reset();
  })
  .catch(err => {
    console.error("Error:", err);
    alert("There was an error submitting the job report.");
  });
});
