document.getElementById('jobForm').addEventListener('submit', function(e) {
  let valid = true;
  document.getElementById('titleError').textContent = '';
  document.getElementById('descError').textContent = '';
  document.getElementById('dateError').textContent = '';
  document.getElementById('linkError').textContent = '';
  
  const title = document.getElementById('jobTitle').value.trim();
  if (title === '') {
    document.getElementById('titleError').textContent = 'Job title is required.';
    valid = false;
  }
  
  const description = document.getElementById('jobDescription').value.trim();
  if (description.length < 20) {
    document.getElementById('descError').textContent = 'Job description should be at least 20 characters.';
    valid = false;
  }
  
  const datePosted = document.getElementById('datePosted').value;
  if (!datePosted) {
    document.getElementById('dateError').textContent = 'Date posted is required.';
    valid = false;
  }
  
  const jobLink = document.getElementById('jobLink').value.trim();
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
    e.preventDefault();
  }
});
